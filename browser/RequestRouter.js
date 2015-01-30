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
	A_TAG_NAME = 'A',
	BODY_TAG_NAME = 'BODY';

/**
 * Creates new instance of browser request router.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve services.
 * @constructor
 */
function RequestRouter($serviceLocator) {
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._window = $serviceLocator.resolve('window');
	this._documentRenderer = $serviceLocator.resolve('documentRenderer');
	this._stateProvider = $serviceLocator.resolve('stateProvider');
	this._contextFactory = $serviceLocator.resolve('contextFactory');

	this._isHistorySupported = this._window.history &&
		this._window.history.pushState instanceof Function;
	this._wrapDocument();
	var self = this;
	this._changeState(new URI(this._window.location.toString()))
		.then(function () {
			self._eventBus.emit('ready');
		});
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
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
RequestRouter.prototype._eventBus = null;

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
RequestRouter.prototype._contextFactory = null;

/**
 * Current state provider.
 * @type {StateProvider}
 * @private
 */
RequestRouter.prototype._stateProvider = null;

/**
 * Current document renderer.
 * @type {DocumentRenderer}
 * @private
 */
RequestRouter.prototype._documentRenderer = null;

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
RequestRouter.prototype._isHistorySupported = false;

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
			fulfill();
			return;
		}

		// if only URI fragment is changed
		var newQuery = newLocation.query ?
			newLocation.query.toString() : null,
			currentQuery = self._location.query ?
				self._location.query.toString() : null;
		if (newLocation.path === self._location.path &&
			newQuery === currentQuery) {
			self._location = newLocation;
			fulfill();
			return;
		}

		self._changeState(newLocation)
			.then(fulfill)
			.catch(reject);
	});
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
	if (!this._isHistorySupported ||
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
 * Changes current application state with new location.
 * @param {URI} newLocation New location.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._changeState = function (newLocation) {
	this._location = newLocation;
	var state = this._stateProvider.getStateByUri(newLocation),
		routingContext = this._contextFactory.create({
			referrer: this._referrer || this._window.document.referrer,
			location: this._location,
			userAgent: this._window.navigator.userAgent
		});

	var self = this;
	return this._documentRenderer
		.render(state, routingContext)
		.then(function () {
			self._referrer = self._location;
		});
};

/**
 * Wraps document with required events to route requests.
 * @private
 */
RequestRouter.prototype._wrapDocument = function () {
	var self = this;

	if (!this._isHistorySupported) {
		return;
	}

	this._window.addEventListener('popstate', function () {
		self.route().catch(self._errorHandler.bind(self));
	});

	this._window.document.body.addEventListener('click', function (event) {
		if (event.target.tagName === A_TAG_NAME) {
			self._linkClickHandler(event, event.target)
				.catch(self._errorHandler.bind(self));
		} else {
			var link = closestLink(event.target);
			if (!link) {
				return;
			}
			self._linkClickHandler(event, link)
				.catch(self._errorHandler.bind(self));
		}
	});
};

/**
 * Handles link click on page.
 * @param {Event} event Event-related object.
 * @param {Element} element Link element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
RequestRouter.prototype._linkClickHandler = function (event, element) {
	if (!element) {
		return Promise.resolve();
	}

	var targetAttribute = element.getAttribute(TARGET_ATTRIBUTE_NAME);
	if (targetAttribute) {
		return Promise.resolve();
	}

	// if middle mouse button was clicked
	if (event.button === MOUSE_KEYS.MIDDLE) {
		return Promise.resolve();
	}

	var locationString = element.getAttribute(HREF_ATTRIBUTE_NAME);
	if (!locationString) {
		return Promise.resolve();
	}

	event.preventDefault();
	return this.go(locationString);
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
 * Finds the closest parent "A" element node.
 * @param {Node} element Dom element.
 * @returns {Node|null} The closest "A" element or null.
 */
function closestLink(element) {
	while(element.nodeName !== A_TAG_NAME &&
		element.nodeName !== BODY_TAG_NAME) {
		element = element.parentNode;
	}
	return element.nodeName === A_TAG_NAME ? element : null;
}