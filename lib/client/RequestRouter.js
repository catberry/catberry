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

module.exports = RequestRouter;

var util = require('util'),
	EventRouter = require('./EventRouter'),
	RequestRouterBase = require('../RequestRouterBase');

util.inherits(RequestRouter, RequestRouterBase);

var HREF_ATTRIBUTE_NAME = 'href';

/**
 * Creates new instance of client-side request router.
 * @param {PageRenderer} $pageRenderer Page renderer to render placeholders.
 * @param {Logger} $logger Logger to log errors and trace.
 * @param {Window} $window Browser window.
 * @param {EventRouter} $eventRouter Event router to route hash tags.
 * @constructor
 * @extends RequestRouterBase
 */
function RequestRouter($pageRenderer, $logger, $window, $eventRouter) {
	RequestRouterBase.call(this, $pageRenderer, $logger);
	this._window = $window;
	this._eventRouter = $eventRouter;
	this._historySupported = this._window.history &&
		this._window.history.pushState instanceof Function;

	var state = this._parseParameters($window.document.location);
	this._currentPath = state.$global.$path;

	this._invokeEventRoute();
	this._wrapDocument();
}

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
RequestRouter.prototype._window = null;

/**
 * Current location path.
 * @type {string}
 * @private
 */
RequestRouter.prototype._currentPath = null;

/**
 * Current hash tag
 * @type {string}
 * @private
 */
RequestRouter.prototype._currentHash = null;

/**
 * True if current browser supports history API.
 * @type {boolean}
 * @private
 */
RequestRouter.prototype._historySupported = false;

/**
 * Current event router.
 * @type {EventRouter}
 * @private
 */
RequestRouter.prototype._eventRouter = null;

/**
 * Routes client-side render request.
 */
RequestRouter.prototype.route = function () {
	var self = this;
	// because now location was not change yet and
	// different browsers handle popstate differently
	// we need to do that ugly thing
	setTimeout(function () {
		var state = self._parseParameters(self._window.document.location);

		if (state.$global.$path === self._currentPath) {
			return;
		}

		if (!self._pageRenderer.canRender(state.$global.$pageName)) {
			return;
		}
		self._currentPath = state.$global.$path;
		self._pageRenderer.render(self._window.document, state, function () {
			self._invokeEventRoute();
		});
	}, 0);
};

/**
 * Invokes event route if hash was specified.
 * @private
 */
RequestRouter.prototype._invokeEventRoute = function () {
	var state = this._parseParameters(this._window.document.location);
	var hash = state.$global.$hash;
	if (hash === this._currentHash) {
		return;
	}
	this._currentHash = hash;
	this._eventRouter.route(state);
};

/**
 * Wraps document with required events to route requests.
 * @private
 */
RequestRouter.prototype._wrapDocument = function () {
	var self = this;

	this._window.onhashchange = function () {
		self._invokeEventRoute();
	};

	if (!this._historySupported) {
		return;
	}

	this._window.onpopstate = function () {
		self.route();
	};

	this._window.document.body.onclick = function (event) {
		if (event.target.tagName === 'A') {
			var location;
			for (var i = 0; i < event.target.attributes.length; i++) {
				var attribute = event.target.attributes[i];
				if (attribute.name.toLocaleLowerCase() ===
					HREF_ATTRIBUTE_NAME) {
					location = attribute.value;
					break;
				}
			}
			if (!location) {
				return;
			}

			var state = self._parseParameters(location);
			if (self._pageRenderer.canRender(state.$pageName)) {
				event.preventDefault();
				self._window.history.pushState(state, '', location);
				self.route();
			}
		}
	};
};