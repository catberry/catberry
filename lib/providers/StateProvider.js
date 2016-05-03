'use strict';

const StateProviderBase = require('../base/StateProviderBase');
const RouteParser = require('../tokenizers/RouteParser');

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
		const parser = new RouteParser();

		var routeDefinitions;

		try {
			routeDefinitions = serviceLocator.resolveAll('routeDefinition');
		} catch (e) {
			routeDefinitions = [];
		}

		routeDefinitions
			.forEach(route => {
				// just colon-parametrized string
				if (typeof (route) === 'string') {
					descriptors.push(parser.parseRouteExpression(route));
					return;
				}

				// extended colon-parametrized mapper
				if (typeof (route) === 'object' &&
						typeof (route.expression) === 'string') {

					const descriptor = parser.parseRouteExpression(route.expression);

					if (typeof (route.name) === 'string') {
						descriptor.name = route.name;
					}

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
