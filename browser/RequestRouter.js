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
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = RequestRouter;

var util = require('util'),
	URI = require('catberry-uri').URI;

var MOUSE_KEYS = {
		LEFT: 0,
		MIDDLE: 1
	},

	HREF_ATTRIBUTE_NAME = 'href',
	TARGET_ATTRIBUTE_NAME = 'target',
	DATA_EVENT_ATTRIBUTE_NAME = 'data-event',
	A_TAG_NAME = 'A',
	BUTTON_TAG_NAME = 'BUTTON',
	ERROR_WRONG_MODULE_NAME = 'Wrong module name "%s"',
	ERROR_WRONG_PLACEHOLDER_NAME = 'Wrong placeholder name "%s"';

/**
 * Creates new instance of browser request router.
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
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._serviceLocator = $serviceLocator;

	this._historySupported = this._window.history &&
		this._window.history.pushState instanceof Function;
	this._location = new URI(this._window.location.toString());
	this._referrer = this._location;

	// if invoke this method now it can cause infinite recursion
	// when module will use clearHash method
	var self = this;
	setTimeout(function () {
		self._raiseHashChangeEvent();
	}, 0);
	this._wrapDocument();
	this._eventBus.emit('ready');
}

/**
 * Current referrer.
 * @type {URI}
 * @private
 */
RequestRouter.prototype._referrer = '';

/**
 * Current location.
 * @type {URI}
 * @private
 */
RequestRouter.prototype._location = null;

/**
 * Current application event.
 * @type {string}
 * @private
 */
RequestRouter.prototype._currentEvent = '';

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
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
RequestRouter.prototype._contextFactory = null;

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
 * Routes browser render request.
 * @returns {Promise} Promise for nothing.
 */
RequestRouter.prototype.route = function () {
	var self = this;
	// because now location was not change yet and
	// different browsers handle `popstate` differently
	// we need to do route in next iteration of event loop
	return new Promise(function (fulfill, reject) {
		var newLocation = new URI(self._window.location.toString()),
			newAuthority = newLocation.authority ?
				newLocation.authority.toString() : null,
			currentAuthority = self._location.authority ?
				self._location.authority.toString() : null;

		if (newLocation.scheme !== self._location.scheme ||
			newAuthority !== currentAuthority) {
			return;
		}

		var newQuery = newLocation.query ?
			newLocation.query.toString() : null,
			currentQuery = self._location.query ?
				self._location.query.toString() : null;
		if (newLocation.path === self._location.path &&
			newQuery === currentQuery) {
			self._location = newLocation;
			return self._raiseHashChangeEvent().then(fulfill, reject);
		}

		self._location = newLocation;
		var state = self._stateProvider.getStateByUri(newLocation),
			renderingParameters = self._contextFactory.create(
				self._moduleLoader.lastRenderedData,
				self._serviceLocator.resolve('cookiesWrapper'),
				state, {
					referrer: self._referrer,
					location: self._location,
					userAgent: self._window.navigator.userAgent
				}
			);

		return self._pageRenderer.render(renderingParameters)
			.then(function () {
				self._referrer = self._location;
				self._eventBus.emit('stateChanged', renderingParameters);
				return self._raiseHashChangeEvent();
			})
			.then(fulfill, reject);
	});
};

/**
 * Clears current location hash and invokes route.
 */
RequestRouter.prototype.clearHash = function () {
	var wrappedWindow = this.$(this._window),
	// save current scroll position to restore it after hash will be cleared
		position = wrappedWindow.scrollTop();
	this._window.location.hash = '';
	wrappedWindow.scrollTop(position);
};

/**
 * Sets application state to specified URI.
 * @param {string} locationString URI to go.
 * @returns {Promise} Promise for nothing.
 */
RequestRouter.prototype.go = function (locationString) {
	var location = new URI(locationString);
	location = location.resolveRelative(this._location);
	locationString = location.toString();

	var currentAuthority = this._location.authority ?
			this._location.authority.toString() : null,
		newAuthority = location.authority ?
			location.authority.toString() : null;
	// we must check if this is an external link before map URI
	// to internal application state
	if (!this._historySupported ||
		location.scheme !== this._location.scheme ||
		newAuthority !== currentAuthority) {
		this._window.location.assign(locationString);
		return Promise.resolve();
	}

	var state = this._stateProvider.getStateByUri(location);
	if (!state) {
		this._window.location.assign(locationString);
		return Promise.resolve();
	}

	this._window.history.pushState(state, '', locationString);
	return this.route();
};

/**
 * Requests render of specified placeholder.
 * @param {string} moduleName Name of module.
 * @param {string} placeholderName Name of placeholder.
 * @returns {Promise} Promise for nothing.
 */
RequestRouter.prototype.requestRender = function (moduleName, placeholderName) {
	var modulesByNames = this._moduleLoader.getModulesByNames(),
		module = modulesByNames[moduleName];
	if (!module) {
		return Promise.reject(
			new Error(util.format(ERROR_WRONG_MODULE_NAME, moduleName))
		);
	}

	var placeholder = module.placeholders[placeholderName];
	if (!placeholder) {
		return Promise.reject(
			new Error(util.format(
				ERROR_WRONG_PLACEHOLDER_NAME,
				placeholderName
			))
		);
	}

	this._eventBus.emit('renderRequested', {
		placeholderName: placeholder.name,
		moduleName: module.name
	});

	var currentState = this._stateProvider.getStateByUri(this._location),
		renderingParameters = this._contextFactory.create(
			this._moduleLoader.lastRenderedData,
			this._serviceLocator.resolve('cookiesWrapper'),
			currentState, {
				referrer: this._referrer,
				location: this._location,
				userAgent: this._window.navigator.userAgent
			}
		);

	return this._pageRenderer.renderPlaceholder(
		placeholder, renderingParameters
	)
		.then(function (context) {
			var afterPromises = context.afterMethods
				.map(function (afterMethod) {
					try {
						return Promise.resolve(afterMethod());
					} catch (e) {
						return Promise.reject(e);
					}
				});
			return Promise.all(afterPromises);
		});
};

/**
 * Raises event route if hash was specified.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._raiseHashChangeEvent = function () {
	var event = this._location.fragment || '';
	if (event === this._currentEvent) {
		return Promise.resolve();
	}
	this._currentEvent = event;
	return this._eventRouter.routeHashChange(event);
};

/**
 * Wraps document with required events to route requests.
 * @private
 */
RequestRouter.prototype._wrapDocument = function () {
	var self = this,
		window = this.$(this._window);

	window.on('hashchange', function () {
		self._location = new URI(self._window.location.toString());
		self._raiseHashChangeEvent().then(null, self._errorHandler.bind(self));
	});

	if (!this._historySupported) {
		return;
	}

	window.on('popstate', function () {
		self.route().then(null, self._errorHandler.bind(self));
	});

	this.$(this._window.document.body)
		.click(function (event) {
			var wrappedTarget = self.$(event.target);
			switch (event.target.tagName) {
				case A_TAG_NAME:
				case BUTTON_TAG_NAME:
					self._linkClickHandler(event, wrappedTarget)
						.then(null, self._errorHandler.bind(self));
					break;
				default:
					var link = wrappedTarget.closest('a');
					if (link.length !== 1) {
						return;
					}
					self._linkClickHandler(event, link)
						.then(null, self._errorHandler.bind(self));
					break;
			}
		})
		.submit(function (event) {
			self._submitClickHandler(event)
				.then(null, self._errorHandler.bind(self));
		});
};

/**
 * Handles link click on page.
 * @param {EventObject} event Event-related object.
 * @param {jQuery} wrappedTarget jQuery wrapper for target element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._linkClickHandler = function (event, wrappedTarget) {
	var target = wrappedTarget.attr(TARGET_ATTRIBUTE_NAME),
		dataEvent = wrappedTarget.attr(DATA_EVENT_ATTRIBUTE_NAME);

	if (target) {
		return Promise.resolve();
	}

	// if middle mouse button was clicked
	if (event.button === MOUSE_KEYS.MIDDLE) {
		return Promise.resolve();
	}

	if (dataEvent) {
		event.preventDefault();
		return this._eventRouter.routeDataEvent(dataEvent, wrappedTarget);
	}

	if (event.target.tagName === BUTTON_TAG_NAME) {
		return Promise.resolve();
	}

	var locationString = wrappedTarget.attr(HREF_ATTRIBUTE_NAME);

	if (!locationString) {
		return Promise.resolve();
	}

	event.preventDefault();
	return this.go(locationString);
};

/**
 * Handles submit input clicks.
 * @param {EventObject} event Event-related object.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._submitClickHandler = function (event) {
	var self = this,
		form = this.$(event.target);

	if (!form.is('form')) {
		return Promise.resolve();
	}

	if (!this._formSubmitter.canSubmit(form)) {
		return Promise.resolve();
	}

	event.preventDefault();
	return this._formSubmitter.submit(form)
		.then(function () {
			var action = form.attr('action');
			if (action) {
				return self.go(action);
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