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

var EventRouter = require('./EventRouter'),
	util = require('util'),
	url = require('url');

var MOUSE_KEYS = {
		LEFT: 0,
		MIDDLE: 1
	},
	HREF_ATTRIBUTE_NAME = 'href',
	TARGET_ATTRIBUTE_NAME = 'target',
	DATA_EVENT_ATTRIBUTE_NAME = 'data-event',
	A_TAG_NAME = 'A',
	INPUT_TAG_NAME = 'INPUT',
	FORM_ELEMENT_NAME = 'form',
	SUBMIT_INPUT_TYPE = 'submit',
	PROTOCOL_REGEXP = /^\w+:/,
	HASH_REGEXP = /^#(.)+$/,
	ERROR_WRONG_MODULE_NAME = 'Wrong module name "%s"',
	ERROR_WRONG_PLACEHOLDER_NAME = 'Wrong placeholder name "%s"';

/**
 * Creates new instance of client-side request router.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve services.
 * @constructor
 */
function RequestRouter($serviceLocator) {
	this.$ = $serviceLocator.resolve('jQuery');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._window = $serviceLocator.resolve('window');
	this._eventRouter = $serviceLocator.resolve('eventRouter');
	this._pageRenderer = $serviceLocator.resolve('pageRenderer');
	this._formSubmitter = $serviceLocator.resolve('formSubmitter');
	this._stateProvider = $serviceLocator.resolve('stateProvider');
	this._moduleLoader = $serviceLocator.resolve('moduleLoader');
	this._historySupported = this._window.history &&
		this._window.history.pushState instanceof Function;
	this._serviceLocator = $serviceLocator;

	var self = this;
	this._currentPath = this._window.location.pathname +
		this._window.location.search;
	this._currentHost = this._window.location.host;

	// if invoke this method now it can cause infinite recursion
	// when module will use clearHash method
	setTimeout(function () {
		self._raiseHashChangeEvent();
	}, 0);
	this._wrapDocument();
	this._eventBus.emit('ready');
}

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
RequestRouter.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
RequestRouter.prototype._serviceLocator = null;

/**
 * Current module loader.
 * @type {ModuleLoader}
 * @private
 */
RequestRouter.prototype._moduleLoader = null;

/**
 * Current state provider.
 * @type {StateProvider}
 * @private
 */
RequestRouter.prototype._stateProvider = null;

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
RequestRouter.prototype._currentPath = '';

/**
 * Current host.
 * @type {string}
 * @private
 */
RequestRouter.prototype._currentHost = '';

/**
 * Current hash tag
 * @type {string}
 * @private
 */
RequestRouter.prototype._currentHash = '';

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
		if (self._window.location.host !== self._currentHost) {
			return;
		}

		var state = self._stateProvider.getStateByUrl(
				self._window.location.toString()),
			urlPath = self._window.location.pathname +
				self._window.location.search;

		if (urlPath === self._currentPath) {
			self._raiseHashChangeEvent();
			return;
		}

		self._currentPath = urlPath;
		var renderingParameters = self._createRenderingParameters(state);
		self._pageRenderer.render(renderingParameters, function (error) {
			if (error) {
				self._errorHandler(error);
				return;
			}
			self._eventBus.emit('stateChanged', renderingParameters);
			self._raiseHashChangeEvent();
		});
	}, 0);
};

/**
 * Clears current location hash and invokes route.
 */
RequestRouter.prototype.clearHash = function () {
	var wrappedWindow = this.$(this._window);
	// save current scroll position to restore it after hash will be cleared
	var position = wrappedWindow.scrollTop();
	this._window.location.hash = '';
	wrappedWindow.scrollTop(position);
};

/**
 * Sets application state to specified URL.
 * @param {string} location URL to go.
 */
RequestRouter.prototype.go = function (location) {
	location = this._normalizeLocation(location);
	var locationInfo = url.parse(location),
		state = this._stateProvider.getStateByUrl(location);

	// we must check if this is an external link before map URL
	// to internal state URL
	if (locationInfo.protocol && locationInfo.host &&
		(locationInfo.protocol !== this._window.location.protocol ||
			locationInfo.host !== this._currentHost) ||
		!this._historySupported || !state) {
		this._window.location.assign(location);
		return;
	}

	this._window.history.pushState(state, '', location);
	this.route();
};

/**
 * Requests render of specified placeholder.
 * @param {string} moduleName Name of module.
 * @param {string} placeholderName Name of placeholder.
 * @param {Function?} callback Callback on finish.
 */
RequestRouter.prototype.requestRender =
	function (moduleName, placeholderName, callback) {
		callback = callback instanceof Function ? callback : dummy;

		var modulesByNames = this._moduleLoader.getModulesByNames();
		var module = modulesByNames[moduleName];
		if (!module) {
			throw new Error(util.format(ERROR_WRONG_MODULE_NAME, moduleName));
		}

		var placeholder = module.placeholders[placeholderName];
		if (!placeholder) {
			throw new Error(util.format(ERROR_WRONG_PLACEHOLDER_NAME,
				placeholderName));
		}

		this._eventBus.emit('renderRequested', {
			placeholderName: placeholder.name,
			moduleName: module.name
		});

		var currentState = this._stateProvider.getStateByUrl(
				this._window.location.toString()
			),
			parameters = this._createRenderingParameters(currentState);

		this._pageRenderer.renderPlaceholder(
			placeholder, parameters, {}, callback);
	};

/**
 * Raises event route if hash was specified.
 * @private
 */
RequestRouter.prototype._raiseHashChangeEvent = function () {
	var hash = this._window.location.hash;

	if (hash === this._currentHash) {
		return;
	}
	var self = this;
	this._currentHash = hash;
	this._eventRouter.routeHashChange(hash ? hash.substring(1) : hash,
		function (error) {
			if (error) {
				self._errorHandler(error);
			}
		});
};

/**
 * Wraps document with required events to route requests.
 * @private
 */
RequestRouter.prototype._wrapDocument = function () {
	var self = this,
		window = this.$(this._window);

	window.on('hashchange', function () {
		self._raiseHashChangeEvent();
	});

	if (!this._historySupported) {
		return;
	}

	window.on('popstate', function () {
		self.route();
	});

	this.$(this._window.document.body)
		.click(function (event) {
			var wrappedTarget = self.$(event.target);
			switch (event.target.tagName) {
				case A_TAG_NAME:
					self._linkClickHandler(event, wrappedTarget);
					break;
				case INPUT_TAG_NAME:
					self._submitClickHandler(event);
					break;
				default:
					var link = wrappedTarget.closest('a');
					if (link.length === 1) {
						self._linkClickHandler(event, link);
					}
			}
		});
};

/**
 * Handles link click on page.
 * @param {EventObject} event Event-related object.
 * @param {jQuery} wrappedTarget jQuery wrapper for target element.
 * @private
 */
RequestRouter.prototype._linkClickHandler = function (event, wrappedTarget) {
	var target = wrappedTarget.attr(TARGET_ATTRIBUTE_NAME),
		dataEvent = wrappedTarget.attr(DATA_EVENT_ATTRIBUTE_NAME);

	if (target) {
		return;
	}

	var location = wrappedTarget.attr(HREF_ATTRIBUTE_NAME);

	// if middle mouse button was clicked
	if (event.button === MOUSE_KEYS.MIDDLE) {
		return;
	}

	var self = this;
	if (dataEvent) {
		event.preventDefault();
		this._eventRouter.routeEvent(dataEvent, false, function (error) {
			if (error) {
				self._errorHandler(error);
			}
		});
		return;
	}

	if (HASH_REGEXP.test(location)) {
		this._window.location.hash = location;
		location = this._window.location.toString();
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
		wrappedTarget = this.$(event.target);

	if (wrappedTarget.attr('type') !== SUBMIT_INPUT_TYPE) {
		return;
	}

	if (wrappedTarget.prop('disabled')) {
		return;
	}

	var form = wrappedTarget.closest(FORM_ELEMENT_NAME);
	if (form.length !== 1 || !this._formSubmitter.canSubmit(form)) {
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
	this._eventBus.emit('error', error);
};

/**
 * Normalizes URL and converts relative URL to absolute.
 * @param {string} location URL to normalize.
 * @returns {string} Normalized URL.
 * @private
 */
RequestRouter.prototype._normalizeLocation = function (location) {
	if (!location || location.length === 0) {
		return this._window.location.toString();
	}

	// if it has protocol then it is absolute URL
	if (PROTOCOL_REGEXP.test(location)) {
		return location;
	}

	// otherwise it is relative URL
	var current = location[0] !== '/' ?
			this._window.location.pathname.split('/') : [],
		newLocation = location.split('/');

	newLocation.forEach(function (part) {
		if (part.length === 0 || part === '.') {
			return;
		}
		if (part === '..') {
			current.pop();
		} else {
			current.push(part);
		}
	});

	current = current.filter(function (part) {
		return part.length !== 0;
	});

	return this._window.location.protocol + '//' +
		this._window.location.host + '/' + current.join('/');
};

/**
 * Creates rendering context.
 * @param {Object} state Application state object.
 * @returns {{renderedData: Object, state: Object, cookies: CookiesWrapper}}
 * @private
 */
RequestRouter.prototype._createRenderingParameters = function (state) {
	var apiProvider = this._serviceLocator.resolve('moduleApiProvider'),
		context = Object.create(apiProvider);
	context.renderedData = this._moduleLoader.lastRenderedData;
	context.state = state;
	context.cookies = this._serviceLocator.resolve('cookiesWrapper');
	context.cookies.initWithString(this._window.document.cookie.toString());
	return context;
};

/**
 * Does nothing and is used as default callback.
 */
function dummy() {}