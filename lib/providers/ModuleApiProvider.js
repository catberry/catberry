'use strict';

const ModuleApiProviderBase = require('./../base/ModuleApiProviderBase');

const SCRIPT_TAG_REGEXP = /<(\/)?(script)>/ig;
const SCRIPT_TAG_REPLACEMENT = '&lt;$1$2&gt;';

/**
 * Implements the module API provider for the server environment.
 */
class ModuleApiProvider extends ModuleApiProviderBase {

	/**
	 * Creates a new instance of the the module API provider.
	 * @param {ServiceLocator} locator Service locator for resolving dependencies.
	 */
	constructor(locator) {
		super(locator);

		/**
		 * Current set of done actions.
		 * @type {Object}
		 * @private
		 */
		this.actions = {
			redirectedTo: '',
			isNotFoundCalled: false,
			isFragmentCleared: false
		};
	}

	/**
	 * Returns false because the environment is supposed to be the server.
	 * @return {boolean} false.
	 */
	get isBrowser() {
		return false;
	}

	/**
	 * Returns true because the environment is supposed to be the server.
	 * @return {boolean} true.
	 */
	get isServer() {
		return true;
	}

	/**
	 * Sets the "not found" flag which means Catberry should hand over
	 * request handling to the next middleware.
	 * @returns {Promise} The promise for finished work.
	 */
	notFound() {
		this.actions.isNotFoundCalled = true;
		return Promise.resolve();
	}

	/**
	 * Redirects the current page to the specified URI using 302 HTTP status code.
	 * @param {string} uriString The URI to direct.
	 * @returns {Promise} The promise for finished work.
	 */
	redirect(uriString) {
		this.actions.redirectedTo = uriString;
		this.actions.redirectionStatusCode = 302;
		return Promise.resolve();
	}

	/**
	 * Redirects the current page to the specified URI using 301 HTTP status code.
	 * @param {string} uriString The URI to direct.
	 * @returns {Promise} The promise for finished work.
	 */
	permRedirect(uriString) {
		this.actions.redirectedTo = uriString;
		this.actions.redirectionStatusCode = 301;
		return Promise.resolve();
	}

	/**
	 * Clears current URI's fragment.
	 * @returns {Promise} The promise for finished work.
	 */
	clearFragment() {
		this.actions.isFragmentCleared = true;
		return Promise.resolve();
	}

	/**
	 * Gets inline script for making stored actions.
	 * @returns {string} SCRIPT tag with inline JavaScript to make actions.
	 */
	getInlineScript() {
		var scriptLines = '';

		if (this.cookie.setCookie.length > 0) {
			this.cookie.setCookie
				.forEach(cookieSetup => (scriptLines += `window.document.cookie = '${this._escapeString(cookieSetup)}';`));
			this.cookie.setCookie = [];
		}

		if (this.actions.redirectedTo) {
			scriptLines += `window.location.assign('${this._escapeString(this.actions.redirectedTo)}');`;
			this.actions.redirectedTo = null;
			this.actions.redirectionStatusCode = null;
		}

		if (this.actions.isFragmentCleared) {
			scriptLines += 'window.location.hash = \'\';';
			this.actions.isFragmentCleared = false;
		}

		if (scriptLines.length > 0) {
			scriptLines = scriptLines.replace(SCRIPT_TAG_REGEXP, SCRIPT_TAG_REPLACEMENT);
			scriptLines = `<script>${scriptLines}</script>`;
		}

		return scriptLines;
	}

	/**
	 * Escapes a string for including into the inline script.
	 * @param {string} str The string to escape.
	 */
	_escapeString(str) {
		return str.replace(/['\\]/g, '\\$&');
	}
}
module.exports = ModuleApiProvider;
