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

module.exports = ModuleApiProvider;

var util = require('util'),
	propertyHelper = require('./helpers/propertyHelper'),
	ModuleApiProviderBase = require('./base/ModuleApiProviderBase');

util.inherits(ModuleApiProvider, ModuleApiProviderBase);

/**
 * Creates new instance of module API provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 * @extends ModuleApiProviderBase
 */
function ModuleApiProvider($serviceLocator) {
	ModuleApiProviderBase.call(this, $serviceLocator);

	propertyHelper.defineReadOnly(this, 'isBrowser', false);
	propertyHelper.defineReadOnly(this, 'isServer', true);
}

/**
 * Current list of redirects which were called in this context.
 * @type {string}
 */
ModuleApiProvider.prototype.redirectedTo = null;

/**
 * Determines if clearHash method was called in this context.
 * @type {Boolean}
 */
ModuleApiProvider.prototype.isHashCleared = false;

/**
 * Redirects current page to specified URI.
 * @param {string} uriString URI to direct.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.redirect = function (uriString) {
	this.redirectedTo = uriString;
	return Promise.resolve();
};

/**
 * Clears current location's hash.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.clearHash = function () {
	this.isHashCleared = true;
	return Promise.resolve();
};

/**
 * Does nothing because on server it is impossible.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.requestRefresh = function () {
	return Promise.resolve();
};

/**
 * Does nothing because on server it is impossible.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.requestRender = function () {
	return Promise.resolve();
};

/**
 * Does nothing because on server it is impossible.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.render = function () {
	return Promise.resolve();
};