'use strict';

const propertyHelper = require('../../lib/helpers/propertyHelper');
const ModuleApiProviderBase = require('../../lib/base/ModuleApiProviderBase');

class ModuleApiProvider extends ModuleApiProviderBase {

	/**
	 * Creates new instance of the module API provider.
	 * @param {ServiceLocator} $serviceLocator Service locator
	 * to resolve dependencies.
	 */
	constructor(locator) {
		super(locator);
	}

	get isBrowser() {
		return true;
	}

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
