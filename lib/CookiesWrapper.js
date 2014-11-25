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
module.exports = CookiesWrapper;

var util = require('util'),
	CookiesWrapperBase = require('./base/CookiesWrapperBase');

util.inherits(CookiesWrapper, CookiesWrapperBase);

/**
 * Creates new instance of server-side cookies wrapper.
 * @constructor
 */
function CookiesWrapper() {
	CookiesWrapperBase.call(this);
	this.setCookies = [];
	this._cookies = {};
}

/**
 * Current list of cookie string were set in this instance of wrapper.
 * @type {Array}
 */
CookiesWrapper.prototype.setCookies = null;

/**
 * Current cookies string.
 * @type {string}
 * @private
 */
CookiesWrapper.prototype._cookiesString = '';

/**
 * Current map of cookies by name.
 * @type {Object}
 * @private
 */
CookiesWrapper.prototype._cookies = null;

/**
 * Determines that cookies string was parsed.
 * @type {boolean}
 * @private
 */
CookiesWrapper.prototype._isParsed = false;

/**
 * Initializes manager with specified cookies string.
 * @param {string} cookiesString Cookies string.
 */
CookiesWrapper.prototype.initWithString = function (cookiesString) {
	this._cookiesString = cookiesString;
	this._cookies = {};
	this._isParsed = false;
};

/**
 * Gets cookie value by name.
 * @param {string} name Cookie name.
 * @returns {string} Cookie value.
 */
CookiesWrapper.prototype.get = function (name) {
	if (typeof(name) !== 'string') {
		return '';
	}
	if (!this._isParsed) {
		this._cookies = this._parseCookiesString(this._cookiesString);
	}

	return this._cookies[name] || '';
};

/**
 * Sets cookie to this wrapper.
 * @param {Object} cookieSetup Cookie setup object.
 * @param {string} cookieSetup.key Cookie key.
 * @param {string} cookieSetup.value Cookie value.
 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
 * @param {Date?} cookieSetup.expires Expire date.
 * @param {string?} cookieSetup.path URI path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @returns {string} Cookie setup string.
 */
CookiesWrapper.prototype.set = function (cookieSetup) {
	var cookie = this._convertToCookieSetup(cookieSetup);
	this.setCookies.push(cookie);
	return cookie;
};