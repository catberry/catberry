'use strict';

const CookieWrapperBase = require('./base/CookieWrapperBase');

/**
 * Implements the Cookie Wrapper class for the server environment.
 */
class CookieWrapper extends CookieWrapperBase {

	/**
	 * Creates a new instance of the server-side cookie wrapper.
	 */
	constructor() {
		super();

		/**
		 * Current list of cookie strings set in the instance.
		 * @type {Array}
		 */
		this.setCookie = [];

		/**
		 * Current list of cookie setups set in the instance.
		 * @type {Array}
		 */
		this.cookieSetups = [];

		/**
		 * Current cookie string.
		 * @type {string}
		 * @private
		 */
		this._initialCookieString = '';
	}

	/**
	 * Initializes the instance with the specified cookie string.
	 * @param {string} cookieString The cookie string.
	 */
	initWithString(cookieString) {
		this._initialCookieString = cookieString;
	}

	/**
	 * Gets current cookie string.
	 * @returns {string} The cookie string.
	 */
	getCookieString() {
		var string = this._initialCookieString;
		this.cookieSetups.forEach(cookieSetup => {
			string += `${string ? '; ' : ''}${cookieSetup.key}=${cookieSetup.value}`;
		});
		return string;
	}

	/**
	 * Sets a cookie to the instance.
	 * @param {Object} cookieSetup The cookie setup object.
	 * @param {string} cookieSetup.key The cookie key.
	 * @param {string} cookieSetup.value The cookie's value.
	 * @param {number?} cookieSetup.maxAge The cookie's max age in seconds.
	 * @param {Date?} cookieSetup.expires The expiration date.
	 * @param {string?} cookieSetup.path The cookie's URI path.
	 * @param {string?} cookieSetup.domain The cookie's domain.
	 * @param {boolean?} cookieSetup.secure Is the cookie secured.
	 * @param {boolean?} cookieSetup.httpOnly Is the cookie HTTP only.
	 * @returns {string} The cookie setup string.
	 */
	set(cookieSetup) {
		const cookie = this._convertToCookieSetup(cookieSetup);
		this.setCookie.push(cookie);
		this.cookieSetups.push(cookieSetup);
		return cookie;
	}
}

module.exports = CookieWrapper;
