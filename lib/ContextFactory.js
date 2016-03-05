'use strict';

const propertyHelper = require('./helpers/propertyHelper');

class ContextFactory {

	/**
	 * Creates a new instance of the context factory.
	 * @param {ServiceLocator} locator Locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current service locator.
		 * @type {ServiceLocator}
		 * @private
		 */
		this._serviceLocator = locator;
	}

	/**
	 * Creates a new context for modules.
	 * @param {Object} additional Additional parameters.
	 * @param {URI} additional.referrer Current referrer.
	 * @param {URI} additional.location Current location.
	 * @param {string} additional.userAgent Current user agent.
	 */
	create(additional) {
		const apiProvider = this._serviceLocator.resolve('moduleApiProvider');
		const context = Object.create(apiProvider);
		Object.keys(additional)
			.forEach(key => propertyHelper.defineReadOnly(context, key, additional[key]));
		return context;
	}
}

module.exports = ContextFactory;
