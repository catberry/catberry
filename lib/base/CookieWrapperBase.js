'use strict';

/**
 * Implements the basic Cookie Wrapper class for both server
 * and browser environments.
 */
class CookieWrapperBase {

	/**
	 * Gets a map of cookie values by their names.
	 * @returns {Object} The cookies map by their names.
	 */
	getAll() {
		const string = this.getCookieString();
		return this._parseCookieString(string);
	}

	/**
	 * Gets a cookie value by its name.
	 * @param {string} name The cookie name.
	 * @returns {string} The cookie value.
	 */
	get(name) {
		if (typeof (name) !== 'string') {
			return '';
		}

		return this.getAll()[name] || '';
	}

	/**
	 * Parses a cookie string into the map of cookie key/value pairs.
	 * @param {string} string The cookie string.
	 * @returns {Object} The object with cookie values by their names.
	 * @protected
	 */
	_parseCookieString(string) {
		const cookie = Object.create(null);

		if (typeof (string) !== 'string') {
			return cookie;
		}
		string
			.split(/; */)
			.forEach(cookiePair => {
				const equalsIndex = cookiePair.indexOf('=');
				if (equalsIndex < 0) {
					return;
				}

				const key = cookiePair
					.substring(0, equalsIndex)
					.trim();
				const value = cookiePair
					.substring(equalsIndex + 1)
					.trim()
					.replace(/^"|"$/g, '');

				cookie[key] = value;
			});

		return cookie;
	}

	/**
	 * Converts a cookie setup object to the cookie string.
	 * @param {Object} cookieSetup The cookie setup object.
	 * @param {string} cookieSetup.key The cookie key.
	 * @param {string} cookieSetup.value The cookie's value.
	 * @param {number?} cookieSetup.maxAge The cookie's max age in seconds.
	 * @param {Date?} cookieSetup.expires The expiration date.
	 * @param {string?} cookieSetup.path The cookie's URI path.
	 * @param {string?} cookieSetup.domain The cookie's domain.
	 * @param {boolean?} cookieSetup.secure Is the cookie secured.
	 * @param {boolean?} cookieSetup.httpOnly Is the cookie HTTP only.
	 * @returns {string} The cookie string.
	 * @protected
	 */
	_convertToCookieSetup(cookieSetup) {
		if (typeof (cookieSetup.key) !== 'string' ||
			typeof (cookieSetup.value) !== 'string') {
			throw new Error('Wrong key or value');
		}

		var cookie = `${cookieSetup.key}=${cookieSetup.value}`;

		// http://tools.ietf.org/html/rfc6265#section-4.1.1
		if (typeof (cookieSetup.maxAge) === 'number') {
			cookie += `; Max-Age=${cookieSetup.maxAge.toFixed()}`;
			if (!cookieSetup.expires) {
				// by default expire date = current date + max-age in seconds
				cookieSetup.expires = new Date(Date.now() +
					cookieSetup.maxAge * 1000);
			}
		}
		if (cookieSetup.expires instanceof Date) {
			cookie += `; Expires=${cookieSetup.expires.toUTCString()}`;
		}
		if (typeof (cookieSetup.path) === 'string') {
			cookie += `; Path=${cookieSetup.path}`;
		}
		if (typeof (cookieSetup.domain) === 'string') {
			cookie += `; Domain=${cookieSetup.domain}`;
		}
		if (typeof (cookieSetup.secure) === 'boolean' &&
			cookieSetup.secure) {
			cookie += '; Secure';
		}
		if (typeof (cookieSetup.httpOnly) === 'boolean' &&
			cookieSetup.httpOnly) {
			cookie += '; HttpOnly';
		}

		return cookie;
	}
}

module.exports = CookieWrapperBase;
