'use strict';

const propertyHelper = require('../../lib/helpers/propertyHelper');
const ModuleApiProviderBase = require('../../lib/base/ModuleApiProviderBase');

class ModuleApiProvider extends ModuleApiProviderBase {

	/**
	 * Creates a new instance of the module API provider.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {
		super(locator);
	}

	/**
	 * Returns true because works in a browser.
	 * @returns {boolean}
	 */
	get isBrowser() {
		return true;
	}

	/**
	 * Returns false because works in a browser.
	 * @returns {boolean}
	 */
	get isServer() {
		return false;
	}

	/**
	 * Reloads the page for handling "not found" error.
	 * @returns {Promise} Promise for nothing.
	 */
	notFound() {
		const window = this.locator.resolve('window');
		window.location.reload();
		return Promise.resolve();
	}

	/**
	 * Reloads the page for handling error page.
	 * @returns {Promise} Promise for nothing.
	 */
	error() {
		const window = this.locator.resolve('window');
		window.location.reload();
		return Promise.resolve();
	}

	/**
	 * Redirects current page to specified URI.
	 * @param {string} uriString URI to redirect.
	 * @returns {Promise} Promise for nothing.
	 */
	redirect(uriString) {
		const requestRouter = this.locator.resolve('requestRouter');
		return requestRouter.go(uriString);
	}

	/**
	 * Clears current location URI's fragment.
	 * @returns {Promise} Promise for nothing.
	 */
	clearFragment() {
		const window = this.locator.resolve('window');
		const position = window.document.body.scrollTop;
		window.location.hash = '';
		window.document.body.scrollTop = position;
		return Promise.resolve();
	}
}

module.exports = ModuleApiProvider;
