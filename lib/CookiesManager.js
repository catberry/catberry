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

module.exports = CookiesManager;

var util = require('util');

var COOKIE_NAME_REGEXP = /[^\s,;]+/i,
	ERROR_COOKIE_NAME_SHOULD_BE_STRING = 'Cookie name should be a string',
	ERROR_COOKIE_SHOULD_BE_OBJECT = 'Cookie should be an object',
	ERROR_COOKIE_VALUE_SHOULD_BE_STRING = 'Cookie value should be a string',
	ERROR_WRONG_COOKIE_NAME = 'Wrong cookie name "%s", expected %s';

/**
 * Creates new instance of cookies manager.
 * @constructor
 */
function CookiesManager() {
	this._cookies = {};
}

/**
 * Current cookies string.
 * @type {string}
 * @private
 */
CookiesManager.prototype._cookiesString = '';

/**
 * Current map of cookies by name.
 * @type {Object}
 * @private
 */
CookiesManager.prototype._cookies = null;

/**
 * Determines that cookies were changed.
 * @type {boolean}
 * @private
 */
CookiesManager.prototype._isChanged = false;

/**
 * Determines that cookies string was parsed.
 * @type {boolean}
 * @private
 */
CookiesManager.prototype._isParsed = false;

/**
 * Initializes manager with specified cookies string.
 * @param {string} cookiesString Cookies string.
 */
CookiesManager.prototype.initWithString = function (cookiesString) {
	this._cookiesString = cookiesString;
	this._cookies = {};
	this._isChanged = false;
	this._isParsed = false;
};

/**
 * Gets cookie object by name.
 * @param {string} name Cookie name.
 * @returns {Object}
 */
CookiesManager.prototype.get = function (name) {
	if (!this._isParsed) {
		this._parseCookiesString();
	}

	if (this._cookies.hasOwnProperty(name)) {
		return Object.create(this._cookies[name]);
	}

	return null;
};

/**
 * Sets cookie object.
 * @param {string} name Cookie name.
 * @param {Object} cookie Cookie object.
 * @param {string} cookie.value Value of cookie.
 * @param {string?} cookie.path cookie Cookie URL path.
 * (e.g., '/', '/mydir').
 * @param {string?} cookie.domain Cookie domain
 * (e.g., 'example.com', '.example.com' (includes all subdomains).
 * @param {number?} cookie.maxAge Max cookie age in seconds
 * (e.g., 60*60*24*365 for a year)
 * @param {Date?} cookie.expires Date of expiration.
 * @param {boolean?} cookie.secure If true cookie will be passed only via HTTPS.
 */
CookiesManager.prototype.set = function (name, cookie) {
	if (typeof(name) !== 'string') {
		throw new Error(ERROR_COOKIE_NAME_SHOULD_BE_STRING);
	}

	if (!COOKIE_NAME_REGEXP.test(name)) {
		throw new Error(util.format(
			ERROR_WRONG_COOKIE_NAME, name, COOKIE_NAME_REGEXP.toString()));
	}

	if (typeof (cookie) !== 'object') {
		throw new Error(ERROR_COOKIE_SHOULD_BE_OBJECT);
	}

	if (typeof (cookie.value) !== 'string') {
		throw new Error(ERROR_COOKIE_VALUE_SHOULD_BE_STRING);
	}

	if (!this._isParsed) {
		this._parseCookiesString();
	}

	this._setCookieValues(name, cookie);
};

/**
 * Removes cookie by specified name.
 * @param {string} name Name of cookie.
 * @returns {boolean}
 */
CookiesManager.prototype.remove = function (name) {
	if (!this._isParsed) {
		this._parseCookiesString();
	}

	if (this._cookies.hasOwnProperty(name)) {
		this._cookies[name] = {value: ''};
		return true;
	}

	return false;
};

/**
 * Returns cookie string.
 * @returns {string}
 */
CookiesManager.prototype.toString = function () {
	if (!this._isChanged) {
		return this._cookiesString;
	}

	var self = this,
		counter = 0,
		str = '';
	Object.keys(this._cookies)
		.forEach(function (cookieName) {
			if (counter !== 0) {
				str += '; ';
			}
			str += cookieName + '=' + self._cookies[cookieName];
		});

	return str;
};

/**
 * Builds cookies strings array using current map of cookies to set new cookies.
 * @returns {Array<string>}
 */
CookiesManager.prototype.toArray = function () {
	if (!this._isChanged) {
		return this._cookiesString
			.split(';')
			.map(function (pair) {
				return pair.trim();
			});
	}

	var self = this;
	return Object.keys(this._cookies)
		.map(function (cookieName) {

			var cookie = self._cookies[cookieName],
				cookieString = cookieName + '=' +
					encodeURIComponent(cookie.value);

			if (typeof(cookie.path) === 'string') {
				cookieString += '; path=' + cookie.path;
			}
			if (typeof(cookie.domain) === 'string') {
				cookieString += '; domain=' + cookie.domain;
			}
			if (typeof(cookie['max-age']) === 'number') {
				cookieString += '; max-age=' + cookie['max-age'].toFixed();
			}
			if (cookie.expires instanceof Date) {
				cookieString += '; expires=' + cookie.expires.toUTCString();
			}
			if (typeof(cookie.secure) === 'boolean' && cookie.secure) {
				cookieString += '; secure';
			}

			return cookieString;
		});
};

/**
 * Parses cookies string into map of cookie objects.
 * @private
 */
CookiesManager.prototype._parseCookiesString = function () {
	var self = this;
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
			self._cookies[pair[0]] = {
				value: decodeURIComponent(pair[1])
			};
		});
};

/**
 * Sets new values to cookie object.
 * @param {string} name Name of cookie.
 * @param {Object} cookie Cookie object.
 * @param {string} cookie.value Value of cookie.
 * @param {string?} cookie.path cookie Cookie URL path.
 * (e.g., '/', '/mydir').
 * @param {string?} cookie.domain Cookie domain
 * (e.g., 'example.com', '.example.com' (includes all subdomains).
 * @param {number?} cookie.maxAge Max cookie age in seconds
 * (e.g., 60*60*24*365 for a year)
 * @param {Date?} cookie.expires Date of expiration.
 * @param {boolean?} cookie.secure If true cookie will be passed only via HTTPS.
 * @private
 */
CookiesManager.prototype._setCookieValues = function (name, cookie) {
	if (!this._cookies.hasOwnProperty(name)) {
		this._cookies[name] = {};
	}

	this._cookies[name].value = cookie.value;
	if (cookie.expires instanceof Date) {
		this._cookies[name].expires = cookie.expires;
	}
	if (typeof(cookie.path) === 'string') {
		this._cookies[name].path = cookie.path;
	}
	if (typeof(cookie.domain) === 'string') {
		this._cookies[name].domain = cookie.domain;
	}
	if (typeof(cookie.secure) === 'boolean') {
		this._cookies[name].secure = cookie.secure;
	}

	this._isChanged = true;
};