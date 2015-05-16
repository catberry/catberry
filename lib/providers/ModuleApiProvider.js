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
	propertyHelper = require('./../helpers/propertyHelper'),
	ModuleApiProviderBase = require('./../base/ModuleApiProviderBase');

util.inherits(ModuleApiProvider, ModuleApiProviderBase);

var SCRIPT_TAG_REGEXP = /<(\/)?(script)>/ig,
	SCRIPT_TAG_REPLACEMENT = '&lt;$1$2&gt;',
	SCRIPT_REDIRECT_FORMAT = 'window.location.assign(\'%s\');',
	SCRIPT_SET_COOKIE_FORMAT = 'window.document.cookie = \'%s\';',
	SCRIPT_CLEAR_FRAGMENT_FORMAT = 'window.location.hash = \'\';',
// element class is a marker for cleaning on DomReady event.
	SCRIPT_ELEMENT_FORMAT = '<' + 'script>' +
		'%s' +
		'</' + 'script>';

/**
 * Creates new instance of the module API provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 * @extends ModuleApiProviderBase
 */
function ModuleApiProvider($serviceLocator) {
	ModuleApiProviderBase.call(this, $serviceLocator);

	propertyHelper.defineReadOnly(this, 'isBrowser', false);
	propertyHelper.defineReadOnly(this, 'isServer', true);

	this.actions = {
		redirectedTo: '',
		isNotFoundCalled: false,
		isFragmentCleared: false
	};
}

/**
 * Current set of done actions.
 * @type {Object}
 * @private
 */
ModuleApiProvider.prototype.actions = null;

/**
 * Sets not found flag that means Catberry should pass control
 * to another middleware.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.notFound = function () {
	this.actions.isNotFoundCalled = true;
	return Promise.resolve();
};

/**
 * Redirects current page to specified URI.
 * @param {string} uriString URI to direct.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.redirect = function (uriString) {
	this.actions.redirectedTo = uriString;
	return Promise.resolve();
};

/**
 * Clears current URI's fragment.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.clearFragment = function () {
	this.actions.isFragmentCleared = true;
	return Promise.resolve();
};

/**
 * Gets inline script for making stored actions.
 * @returns {String} SCRIPT tag with inline JavaScript to make actions.
 */
ModuleApiProvider.prototype.getInlineScript = function () {
	var scriptLines = '';

	this.cookie.setCookie.forEach(function (cookieSetup) {
		scriptLines += util.format(
			SCRIPT_SET_COOKIE_FORMAT,
			escapeString(cookieSetup)
		);
	});
	this.cookie.setCookie = [];

	if (this.actions.redirectedTo) {
		scriptLines += util.format(
			SCRIPT_REDIRECT_FORMAT,
			escapeString(this.actions.redirectedTo)
		);
		this.actions.redirectedTo = null;
	}

	if (this.actions.isFragmentCleared) {
		scriptLines += util.format(SCRIPT_CLEAR_FRAGMENT_FORMAT);
		this.actions.isFragmentCleared = false;
	}

	scriptLines = scriptLines
		.replace(SCRIPT_TAG_REGEXP, SCRIPT_TAG_REPLACEMENT);
	return scriptLines ? util.format(SCRIPT_ELEMENT_FORMAT, scriptLines) : '';
};

/**
 * Escapes string with inline script.
 * @param {string} str String to escape.
 */
function escapeString(str) {
	return str.replace(/['\\]/g, '\\$&');
}
