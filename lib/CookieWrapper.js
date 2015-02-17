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
module.exports = CookieWrapper;

var util = require('util'),
	CookieWrapperBase = require('./base/CookieWrapperBase');

util.inherits(CookieWrapper, CookieWrapperBase);

/**
 * Creates new instance of the server-side cookie wrapper.
 * @constructor
 */
function CookieWrapper() {
	CookieWrapperBase.call(this);
	this.setCookie = [];
	this._cookie = {};
}

/**
 * Current list of cookie strings were set in this instance of wrapper.
 * @type {Array}
 */
CookieWrapper.prototype.setCookie = null;

/**
 * Current cookie string.
 * @type {string}
 * @private
 */
CookieWrapper.prototype._cookieString = '';

/**
 * Current map of cookie values by names.
 * @type {Object}
 * @private
 */
CookieWrapper.prototype._cookie = null;

/**
 * Determines that cookie string was parsed.
 * @type {boolean}
 * @private
 */
CookieWrapper.prototype._isParsed = false;

/**
 * Initializes manager with specified cookie string.
 * @param {string} cookieString Cookie string.
 */
CookieWrapper.prototype.initWithString = function (cookieString) {
	this._cookieString = cookieString;
	this._cookie = {};
	this._isParsed = false;
};

/**
 * Gets cookie value by name.
 * @param {string} name Cookie name.
 * @returns {string} Cookie value.
 */
CookieWrapper.prototype.get = function (name) {
	if (typeof(name) !== 'string') {
		return '';
	}
	if (!this._isParsed) {
		this._cookie = this._parseCookieString(this._cookieString);
	}

	return this._cookie[name] || '';
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
CookieWrapper.prototype.set = function (cookieSetup) {
	var cookie = this._convertToCookieSetup(cookieSetup);
	this.setCookie.push(cookie);
	return cookie;
};