/* 
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ChatService;

var url = require('url'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter;

var SESSION_USERNAME_KEY = 'chat:username',
	DEFAULT_MESSAGES_LIMIT = 100,
	CHANGE_CHECK_PATH = '/chatApi/change',
	START_SESSION_PATH = '/chatApi/start',
	END_SESSION_PATH = '/chatApi/end',
	GET_MESSAGES_PATH = '/chatApi/get',
	POST_MESSAGE_PATH = '/chatApi/post',
	WHOAMI_PATH = '/chatApi/whoami',
	ERROR_MESSAGE_REQUIRED = '"message" is required parameter',
	ERROR_UNAUTHORIZED = 'Please start session with nickname',
	ERROR_SESSION_MIDDLEWARE = 'Session middleware is not used',
	ERROR_NICKNAME_REQUIRED = '"nickname" is required parameter',
	ERROR_LIMIT_TOO_BIG = '"limit" parameter\'s value is too big, max=100',
	TRACE_USER_STARTS_SESSION = 'User %s starts session',
	TRACE_USER_ENDS_SESSION = 'User %s ends session',
	TRACE_USER_POSTS_MESSAGE = 'User %s posts message to chat',
	TRACE_USER_GETS_MESSAGES = 'User %s gets messages from chat';

util.inherits(ChatService, EventEmitter);

/**
 * Creates new instance of chat service.
 * @constructor
 * @extends EventEmitter
 */
function ChatService($logger) {
	EventEmitter.call(this);
	this.setMaxListeners(0);
	this._logger = $logger;
	this._messages = [];
	this._changedTime = (new Date()).getTime();
}

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ChatService.prototype._logger = null;

/**
 * Returns connect/express middleware for chat service.
 * @returns {Function}
 */
ChatService.prototype.middleware = function () {
	var self = this;
	return function (request, response, next) {
		var urlInfo = url.parse(request.url, true);
		switch (urlInfo.pathname) {
			case START_SESSION_PATH:
				self.startSession(urlInfo, request, response);
				break;
			case END_SESSION_PATH:
				self.endSession(request, response);
				break;
			case GET_MESSAGES_PATH:
				self.getMessages(urlInfo, request, response);
				break;
			case POST_MESSAGE_PATH:
				self.postMessage(urlInfo, request, response);
				break;
			case CHANGE_CHECK_PATH:
				self.changeCheck(urlInfo, request, response);
				break;
			case WHOAMI_PATH:
				self.whoAmI(request, response);
				break;
			default:
				next();
		}
	};
};

/**
 * Responses with user's nickname in chat.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 */
ChatService.prototype.whoAmI = function (request, response) {
	if (!checkSession(request, response)) {
		return;
	}

	if (!checkAuthorization(request, response)) {
		return;
	}

	response.writeHead(200, {
		'Content-Type': 'text/plain'
	});
	response.end(request.session[SESSION_USERNAME_KEY] || '');
};

/**
 * Starts session for current user with nickname.
 * @param {Object} urlInfo URL info from parsed URL.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 */
ChatService.prototype.startSession = function (urlInfo, request, response) {
	if (!checkSession(request, response)) {
		return;
	}

	var nickname = urlInfo.query.nickname;
	if (nickname.length === 0) {
		endWithError(response, ERROR_NICKNAME_REQUIRED);
		return;
	}

	this._logger.trace(util.format(TRACE_USER_STARTS_SESSION), nickname);

	request.session[SESSION_USERNAME_KEY] = nickname;
	response.end();
};

/**
 * Ends session for current user.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 */
ChatService.prototype.endSession = function (request, response) {
	if (!checkSession(request, response)) {
		return;
	}

	this._logger.trace(util.format(TRACE_USER_ENDS_SESSION),
		request.session[SESSION_USERNAME_KEY]);

	request.session[SESSION_USERNAME_KEY] = null;
	response.end();
};

/**
 * Responses with message of this chat.
 * @param {Object} urlInfo URL info from parsed URL.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 */
ChatService.prototype.getMessages = function (urlInfo, request, response) {
	if (!checkSession(request, response)) {
		return;
	}

	if (!checkAuthorization(request, response)) {
		return;
	}

	var limit = urlInfo.query.limit || DEFAULT_MESSAGES_LIMIT;

	if (limit > DEFAULT_MESSAGES_LIMIT) {
		endWithError(response, ERROR_LIMIT_TOO_BIG);
		return;
	}

	this._logger.trace(util.format(TRACE_USER_GETS_MESSAGES),
		request.session[SESSION_USERNAME_KEY]);

	response.writeHead(200, {
		'Content-Type': 'application/json'
	});
	var json = JSON.stringify({messages: this._messages});
	response.end(json);
};

/**
 * Responses to client when chat messages is changed.
 * @param {Object} urlInfo URL info from parsed URL.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 */
ChatService.prototype.changeCheck = function (urlInfo, request, response) {
	if (!checkSession(request, response)) {
		return;
	}

	var time = Number(urlInfo.query.time);

	response.writeHead(200, {
		'Content-Type': 'text/plain'
	});
	if (!time || time < this._changedTime) {
		response.end(this._changedTime.toString());
		return;
	}

	var self = this;
	this.once('change', function () {
		try {
			response.end(self._changedTime.toString());
		} catch (e) {
			// nothing to do here
		}
	});
};

/**
 * Posts new message to this chat.
 * @param {Object} urlInfo URL info from parsed URL.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 */
ChatService.prototype.postMessage = function (urlInfo, request, response) {
	if (!checkSession(request, response)) {
		return;
	}

	if (!checkAuthorization(request, response)) {
		return;
	}

	this._logger.trace(util.format(TRACE_USER_POSTS_MESSAGE,
		request.session[SESSION_USERNAME_KEY]));

	var self = this,
		message = '';
	request.setEncoding('utf8');
	request
		.on('data', function (chunk) {
			message += chunk;
		})
		.on('error', function (error) {
			endWithError(response, error.message);
		})
		.on('end', function () {
			if (!message || message.length === 0) {
				endWithError(response, ERROR_MESSAGE_REQUIRED);
				return;
			}

			self._messages.push({
				time: (new Date()).toLocaleString(),
				author: request.session[SESSION_USERNAME_KEY],
				text: message
			});
			if (self._messages.length > DEFAULT_MESSAGES_LIMIT) {
				self._messages.shift();
			}
			self._changedTime = (new Date()).getTime();
			self.emit('change');
			response.end();
		});

};

/**
 * Ends response with specified error message.
 * @param {http.ServerResponse} response Response to client.
 * @param {string} reason Error reason.
 */
function endWithError(response, reason) {
	response.writeHead(500, reason);
	response.end();
}

/**
 * Checks if session exists in request.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 * @returns {boolean}
 */
function checkSession(request, response) {
	if (!request.session) {
		endWithError(response, ERROR_SESSION_MIDDLEWARE);
		return false;
	}
	return true;
}

/**
 * Checks if user is authorized.
 * @param {http.IncomingMessage} request Incoming request.
 * @param {http.ServerResponse} response Response to client.
 * @returns {boolean}
 */
function checkAuthorization(request, response) {
	var nickname = request.session[SESSION_USERNAME_KEY];
	if (!nickname || nickname.length === 0) {
		response.writeHead(403, ERROR_UNAUTHORIZED);
		response.end();
		return false;
	}

	return true;
}