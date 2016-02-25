'use strict';

const propertyHelper = require('./helpers/propertyHelper');

class ContextFactory {

	/**
	 * Creates new instance of the context factory.
	 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
	 * @constructor
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
	 * Creates new context for modules.
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
