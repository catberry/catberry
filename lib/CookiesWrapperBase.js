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

module.exports = CookiesWrapperBase;

var util = require('util');

/**
 * Creates new instance of cookies manager.
 * @constructor
 */
function CookiesWrapperBase() {
	this._cookies = {};
}

/**
 * Current cookies string.
 * @type {string}
 * @private
 */
CookiesWrapperBase.prototype._cookiesString = '';

/**
 * Current map of cookies by name.
 * @type {Object}
 * @private
 */
CookiesWrapperBase.prototype._cookies = null;

/**
 * Determines that cookies string was parsed.
 * @type {boolean}
 * @private
 */
CookiesWrapperBase.prototype._isParsed = false;

/**
 * Initializes manager with specified cookies string.
 * @param {string} cookiesString Cookies string.
 */
CookiesWrapperBase.prototype.initWithString = function (cookiesString) {
	this._cookiesString = cookiesString;
	this._cookies = {};
	this._isParsed = false;
};

/**
 * Gets cookie value by name.
 * @param {string} name Cookie name.
 * @returns {Object}
 */
CookiesWrapperBase.prototype.get = function (name) {
	if (!this._isParsed) {
		this._parseCookiesString();
	}

	return this._cookies[name];
};

/**
 * Parses cookies string into map of cookie objects.
 * @private
 */
CookiesWrapperBase.prototype._parseCookiesString = function () {
	this._cookies = {};
	this._cookiesString
		.split(';')
		.forEach(function (cookieString) {
			var pair = cookieString
				.trim()
				.split('=');

			if (pair.length !== 2) {
				return;
			}
			this._cookies[pair[0]] = decodeURIComponent(pair[1]);
		}, this);
};

/**
 * Sets cookie to this wrapper.
 * @param {Object} cookieSetup Cookie setup object.
 * @param {string} cookieSetup.key Cookie key.
 * @param {string} cookieSetup.value Cookie value.
 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
 * @param {Date?} cookieSetup.expire Expire date.
 * @param {string?} cookieSetup.path URL path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @protected
 */
CookiesWrapperBase.prototype._convertToCookieSetup = function (cookieSetup) {
	if (typeof(cookieSetup.key) !== 'string' ||
		typeof(cookieSetup.value) !== 'string') {
		throw new Error('Wrong key or value');
	}

	var cookie = cookieSetup.key + '=' + cookieSetup.value;

	if (typeof(cookieSetup.maxAge) === 'number') {
		cookie += '; max-age=' + cookieSetup.maxAge.toFixed();
		if (!cookieSetup.expire) {
			// by default expire date = current date + max-age in seconds
			cookieSetup.expire = new Date((new Date()).getTime() +
				cookieSetup.maxAge * 1000);
		}
	}
	if (cookieSetup.expire instanceof Date) {
		cookie += '; expire=' + cookieSetup.expire.toUTCString();
	}
	if (typeof(cookieSetup.path) === 'string') {
		cookie += '; path=' + cookieSetup.path;
	}
	if (typeof(cookieSetup.domain) === 'string') {
		cookie += '; domain=' + cookieSetup.domain;
	}
	if (typeof(cookieSetup.secure) === 'boolean' &&
		cookieSetup.secure) {
		cookie += '; secure';
	}
	if (typeof(cookieSetup.httpOnly) === 'boolean' &&
		cookieSetup.httpOnly) {
		cookie += '; HttpOnly';
	}

	return cookie;
};

/**
 * Gets the cookie string that initialized this instance.
 * @returns {string}
 */
CookiesWrapperBase.prototype.toString = function () {
	return this._cookiesString;
};