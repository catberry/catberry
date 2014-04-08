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

module.exports = ChatModule;

var util = require('util');

var MESSAGE_ENTER_NICKNAME = 'Please enter nickname',
	ERROR_RENDER_NOT_FOUND =
		'This module does not have method to render placeholder "%s"';
// these all arguments are injected in constructor
// $-prefixed arguments are instances of type registrations in ServiceLocator.
// Other arguments are values from config object.
/**
 * Creates new instance of chat module.
 * @param {Logger} $logger Logger to log some messages.
 * @param {ModuleApiProvider} $moduleApiProvider Module API provider to do
 * some actions on page.
 * @param {ChatServiceClient} $chatServiceClient Chat client
 * to connect and use chat.
 * @param {jQuery} $jQuery jQuery library instance.
 * @param {string} chatSubtitle Chat subtitle text.
 * @constructor
 */
function ChatModule($logger, $moduleApiProvider, $chatServiceClient, $jQuery,
	chatSubtitle) {
	this._logger = $logger;
	this._api = $moduleApiProvider;
	this._chat = $chatServiceClient;
	this.$ = $jQuery;
	this._chatSubtitle = chatSubtitle;

	var self = this;
	if (this._api.whereAmI() === 'browser') {
		this._chat.on('changed', function () {
			self._api.requestRefresh(self, 'messages');
		});
	}
}

/**
 * Current instance of jQuery.
 * @type {jQuery}
 */
ChatModule.prototype.$ = null;
/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ChatModule.prototype._logger = null;
/**
 * Current module API provider.
 * @type {ModuleApiProvider}
 * @private
 */
ChatModule.prototype._api = null;
/**
 * Current chat client.
 * @type {ChatServiceClient}
 * @private
 */
ChatModule.prototype._chat = null;

// following method works on both server-side and client-side
// need to remember do not use environment-specified code here.
/**
 * Renders all specified placeholders by name.
 * @param {string} placeholderName Name of placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.render = function (placeholderName, args, callback) {
	var renderName = placeholderName + 'Render';

	if (!(renderName in this)) {
		var error = new Error(
			util.format(ERROR_RENDER_NOT_FOUND, placeholderName));
		callback(error);
		return;
	}

	this[renderName](args, callback);
};

// methods "handle" and "submit" are executed only on client-side in browser
// usage of browser-specified methods is safe
/**
 * Handles all events (location hash changes) on page.
 * @param {string} eventName Event name "hash"
 * or "!hash" if hash changes to another one.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.handle = function (eventName, callback) {
	var self = this,
		handler = function (error) {
			if (error) {
				window.alert(error);
				return;
			}
			self._api.requestRefresh(self, 'messages');
			self._api.requestRefresh(self, 'post');
		};

	if (eventName === 'auth') {
		var nickname = window.prompt(MESSAGE_ENTER_NICKNAME);
		this._api.clearHash();

		this._chat.startSession(null, nickname, handler);
	} else if (eventName === 'quit') {
		this._api.clearHash();
		this._chat.endSession(null, handler);
	} else {
		callback();
	}
};

/**
 * Submits data to module from HTML forms on page.
 * @param {string} formName Name of form.
 * @param {Object} formObject Object where keys are input names.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.submit = function (formName, formObject, callback) {
	if (formName !== 'post' || !formObject.message ||
		formObject.message.length === 0) {
		callback();
		return;
	}

	this._chat.postMessage(null, formObject.message, function (error) {
		if (error) {
			window.alert(error);
		}
		callback(null);
	});

};

/**
 * Renders messages placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.messagesRender = function (args, callback) {
	this._chat.getMessages(args.$$.$cookies.toString(), 100,
		function (error, data) {
			if (error) {
				callback(null, {message: null});
			} else {
				callback(null, data);
			}
		});
};

/**
 * Renders post form placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.postRender = function (args, callback) {
	this._chat.whoAmI(args.$$.$cookies.toString(), function (error, data) {
		if (error) {
			callback(null, {});
			return;
		}

		callback(null, {nickname: data});
	});
};

/**
 * Renders chat body placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.bodyRender = function (args, callback) {
	callback(null, {chatSubtitle: this._chatSubtitle});
};