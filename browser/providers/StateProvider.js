'use strict';

const StateProviderBase = require('../../lib/base/StateProviderBase');

/**
 * Implements the state provider for the server environment.
 */
class StateProvider extends StateProviderBase {

	/**
	 * Gets a list of route descriptors.
	 * @param {ServiceLocator} serviceLocator The Service locator
	 * for getting route definitions.
	 * @returns {Array} The list of URI mappers.
	 * @private
	 */
	_getRouteDescriptors(serviceLocator) {
		const descriptors = [];

		let routeDefinitions;

		try {
			routeDefinitions = serviceLocator.resolveAll('routeDefinition');
		} catch (e) {
			routeDefinitions = [];
		}

		const routeDescriptors = Object.create(null);

		try {
			serviceLocator.resolveAll('routeDescriptor')
				.forEach(descriptor => {
					routeDescriptors[descriptor.expression] = descriptor;
				});
		} catch (e) {
			// nothing to do
		}

		routeDefinitions
			.forEach(route => {
				// just colon-parametrized string
				if (typeof (route) === 'string') {
					descriptors.push(routeDescriptors[route]);
					return;
				}

				// extended colon-parametrized mapper
				if (typeof (route) === 'object' &&
						typeof (route.expression) === 'string') {

					const descriptor = routeDescriptors[route.expression];

					if (route.map instanceof Function) {
						descriptor.map = route.map;
					}

					descriptors.push(descriptor);
					return;
				}

				// regular expression mapper
				if (typeof (route) === 'object' &&
					(route.expression instanceof RegExp) &&
					(route.map instanceof Function)) {
					descriptors.push(route);
				}
			});

		return descriptors;
	}
}

module.exports = StateProvider;
