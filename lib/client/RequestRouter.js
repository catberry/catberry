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

var moduleContextHelper = require('../helpers/moduleContextHelper'),
	EventRouter = require('./EventRouter');

var HREF_ATTRIBUTE_NAME = 'href',
	A_TAG_NAME = 'A',
	INPUT_TAG_NAME = 'INPUT',
	FORM_TAG_NAME = 'FORM',
	BODY_TAG_NAME = 'BODY',
	SUBMIT_INPUT_TYPE = 'submit',
	HASH_REGEXP = /^#(.)+/;

/**
 * Creates new instance of client-side request router.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve services.
 * @constructor
 */
function RequestRouter($serviceLocator) {
	this.$ = $serviceLocator.resolve('jQuery');
	this._logger = $serviceLocator.resolve('logger');
	this._window = $serviceLocator.resolve('window');
	this._eventRouter = $serviceLocator.resolve('eventRouter');
	this._pageRenderer = $serviceLocator.resolve('pageRenderer');
	this._formSubmitter = $serviceLocator.resolve('formSubmitter');
	this._urlMappingProvider = $serviceLocator.resolve('urlMappingProvider');
	this._historySupported = this._window.history &&
		this._window.history.pushState instanceof Function;

	var mappedUrl = this._urlMappingProvider.map(
			this._window.location.toString()
		),
		state = moduleContextHelper.parseModuleParameters(mappedUrl);

	this._currentPath = state.$url.pathname + state.$url.search;
	this._currentPage = state.$pageName;

	this._invokeEventRoute();
	this._wrapDocument();
}

/**
 * Current URL mapping provider.
 * @type {UrlMappingProvider}
 * @private
 */
RequestRouter.prototype._urlMappingProvider = null;

/**
 * Current logger.
 * @type {Logger}
 * @protected
 */
RequestRouter.prototype._logger = null;

/**
 * Current page renderer.
 * @type {PageRenderer}
 * @private
 */
RequestRouter.prototype._pageRenderer = null;

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
 * Current page to render.
 * @type {string}
 * @private
 */
RequestRouter.prototype._currentPage = null;

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
 * Current form submitter
 * @type {FormSubmitter}
 * @private
 */
RequestRouter.prototype._formSubmitter = null;

/**
 * Current instance of jQuery library.
 * @type {jQuery}
 */
RequestRouter.prototype.$ = null;

/**
 * Routes client-side render request.
 */
RequestRouter.prototype.route = function () {
	var self = this;
	// because now location was not change yet and
	// different browsers handle popstate differently
	// we need to do that ugly thing
	setTimeout(function () {
		var location = self._window.location.toString(),
			mappedUrl = self._urlMappingProvider.map(location),
			state = moduleContextHelper.parseModuleParameters(mappedUrl),
			urlPath = state.$url.pathname + state.$url.search;

		if (urlPath === self._currentPath) {
			self._invokeEventRoute();
			return;
		}

		if (state.$pageName !== self._currentPage) {
			return;
		}

		if (Object.keys(state).length === 0) {
			self._window.location.assign(location);
			return;
		}

		self._currentPath = urlPath;
		self._pageRenderer.render(state, function (error) {
			if (error) {
				self._errorHandler(error);
				if (self._historySupported) {
					self._window.history.back();
				}
				return;
			}
			self._invokeEventRoute();
		});
	}, 0);
};

/**
 * Sets application state to specified URL.
 * @param {string} location URL to go.
 */
RequestRouter.prototype.go = function (location) {
	var mappedUrl = this._urlMappingProvider.map(location),
		state = moduleContextHelper.parseModuleParameters(mappedUrl);

	if (state.$pageName !== this._currentPage || !this._historySupported) {
		this._window.location.assign(location);
		return;
	}

	this._window.history.pushState(state, '', location);
	this.route();
};

/**
 * Invokes event route if hash was specified.
 * @private
 */
RequestRouter.prototype._invokeEventRoute = function () {
	var mappedUrl = this._urlMappingProvider.map(
			this._window.location.toString()
		),
		state = moduleContextHelper.parseModuleParameters(mappedUrl),
		hash = state.$url.hash;

	if (hash === this._currentHash) {
		return;
	}
	this._currentHash = hash;
	this._eventRouter.route(hash ? hash.substring(1) : hash);
};

/**
 * Wraps document with required events to route requests.
 * @private
 */
RequestRouter.prototype._wrapDocument = function () {
	var self = this,
		window = this.$(this._window);

	window.on('hashchange', function () {
		self._invokeEventRoute();
	});

	if (!this._historySupported) {
		return;
	}

	window.on('popstate', function () {
		self.route();
	});

	this.$(this._window.document.body)
		.click(function (event) {
			switch (event.target.tagName) {
				case A_TAG_NAME:
					self._linkClickHandler(event);
					break;
				case INPUT_TAG_NAME:
					self._submitClickHandler(event);
					break;
			}
		});
};

/**
 * Handles link click on page.
 * @param {EventObject} event Event-related object.
 * @private
 */
RequestRouter.prototype._linkClickHandler = function (event) {
	var location = this.$(event.target).attr(HREF_ATTRIBUTE_NAME);

	if (HASH_REGEXP.test(location)) {
		location = this._window.location.toString() + location;
	}

	if (!location) {
		return;
	}

	event.preventDefault();
	this.go(location);
};

/**
 * Handles submit input clicks.
 * @param {EventObject} event Event-related object.
 * @private
 */
RequestRouter.prototype._submitClickHandler = function (event) {
	var self = this,
		element = this.$(event.target);

	if (element.attr('type') !== SUBMIT_INPUT_TYPE) {
		return;
	}

	if (element.prop('disabled')) {
		return;
	}

	var form,
		current = element;

	while (true) {
		current = current.parent();
		if (current.length === 0) {
			return;
		}
		if (current[0].tagName === FORM_TAG_NAME) {
			form = current;
			break;
		}
		if (current[0].tagName === BODY_TAG_NAME) {
			return;
		}
	}

	if (!this._formSubmitter.canSubmit(form)) {
		return;
	}

	event.preventDefault();
	this._formSubmitter.submit(form, function (error) {
		if (error) {
			self._errorHandler(error);
			return;
		}

		var action = form.attr('action');
		if (action) {
			self.go(action);
		}
	});
};

/**
 * Handles all errors.
 * @param {Error} error Error to handle.
 * @private
 */
RequestRouter.prototype._errorHandler = function (error) {
	this._logger.error(error);
};