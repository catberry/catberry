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

module.exports = ChatServiceClient;

var util = require('util'),
	EventEmitter = require('events').EventEmitter;

util.inherits(ChatServiceClient, EventEmitter);

// UHR is a abstract HTTPS request which has the same interface on
// server-side and client-side but has different optimized implementations.
/**
 * Creates new instance of client-side chat service client.
 * @param {UHR} $uhr Universal HTTP(S) Request.
 * @param {string} chatHost Host name of chat service.
 * @param {number} chatHostPort Port number of chat service.
 * @constructor
 * @extends EventEmitter
 */
function ChatServiceClient($uhr, chatHost, chatHostPort) {
	EventEmitter.call(this);
	this.setMaxListeners(0);
	this._uhr = $uhr;
	this._chatHostUrl = 'http://' + chatHost + ':' + chatHostPort;
	this._changedTime = 0;
	this._changeCheck();
}

/**
 * Current instance of Universal HTTP(S) Request.
 * @type {UHR}
 */
ChatServiceClient.prototype._uhr = null;

/**
 * Current chat service URL.
 * @type {string}
 * @private
 */
ChatServiceClient.prototype._chatHostUrl = null;

/**
 * Last change time of chat messages.
 * @type {number}
 * @private
 */
ChatServiceClient.prototype._changedTime = null;

/**
 * Returns nickname of current user.
 * @param {string} cookieString Cookie string to identify user.
 * @param {Function?} callback Callback on finish.
 */
ChatServiceClient.prototype.whoAmI = function (cookieString, callback) {
	callback = callback || dummy;

	var options = {
		headers: {
			Cookie: cookieString
		}
	};
	this._uhr.get(this._chatHostUrl + '/chatApi/whoami', options,
		function (error, status, data) {
			if (error) {
				callback(error);
				return;
			}
			callback(null, data);
		});
};

/**
 * Starts session for current user with nickname.
 * @param {string} cookieString Cookie string for session.
 * @param {string} nickname User nickname.
 * @param {Function?} callback Callback on finish.
 */
ChatServiceClient.prototype.startSession =
	function (cookieString, nickname, callback) {
		callback = callback || dummy;
		var options = {
			headers: {
				Cookie: cookieString
			},
			data: {
				nickname: nickname
			}
		};
		this._uhr.get(this._chatHostUrl + '/chatApi/start', options,
			function (error, status, data) {
				if (error) {
					callback(error);
					return;
				}
				callback(null, data);
			});
	};

/**
 * Ends finish for current user.
 * @param {string} cookieString Cookie string for session.
 * @param {Function?} callback Callback on finish.
 */
ChatServiceClient.prototype.endSession = function (cookieString, callback) {
	callback = callback || dummy;

	var options = {
		headers: {
			Cookie: cookieString
		}
	};

	this._uhr.get(this._chatHostUrl + '/chatApi/end', options,
		function (error, status, data) {
			if (error) {
				callback(error);
				return;
			}
			callback(null, data);
		});
};

/**
 * Gets messages of chat.
 * @param {string} cookieString Cookie string to identify user.
 * @param {number} limit Limit of messages to get.
 * @param {Function?} callback Callback on finish.
 */
ChatServiceClient.prototype.getMessages =
	function (cookieString, limit, callback) {
		callback = callback || dummy;

		var options = {
			headers: {
				Cookie: cookieString
			},
			data: {
				limit: limit
			}
		};

		this._uhr.get(this._chatHostUrl + '/chatApi/get', options,
			function (error, status, data) {
				if (error) {
					callback(error);
					return;
				}
				try {
					callback(null, JSON.parse(data));
				} catch (e) {
					callback(e);
				}
			});
	};

/**
 * Posts message to chat.
 * @param {string} cookieString Cookie string to identify user.
 * @param {string} message Message to post.
 * @param {Function?} callback callback on finish.
 */
ChatServiceClient.prototype.postMessage =
	function (cookieString, message, callback) {
		callback = callback || dummy;

		var options = {
			headers: {
				Cookie: cookieString
			},
			data: message
		};

		this._uhr.post(this._chatHostUrl + '/chatApi/post', options,
			function (error, status, data) {
				if (error) {
					callback(error);
					return;
				}
				callback(null, data);
			});
	};

/**
 * Does long-polling change checks of new messages in chat.
 * @private
 */
ChatServiceClient.prototype._changeCheck = function () {
	var self = this,
		options = {
			data: {
				time: self._changedTime.toString()
			},
			timeout: 30000
		};

	this._uhr.get(this._chatHostUrl + '/chatApi/change', options,
		function (error, status, data) {
			if (!error) {
				self._changedTime = Number(data);
				self.emit('changed');
			}

			setTimeout(function () {
				self._changeCheck();
			}, 1000);
		});
};

/**
 * Does nothing as default callback.
 */
function dummy() {}