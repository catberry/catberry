'use strict';

const routeHelper = require('./../helpers/routeHelper');
const catberryUri = require('catberry-uri');
const URI = catberryUri.URI;

/**
 * Implements the state provider for the server environment.
 */
class StateProvider {

	/**
	 * Create a new instance of the state provider.
	 * @param {ServiceLocator} locator Service locator for resolving URI mappers.
	 */
	constructor(locator) {

		/**
		 * Current list of URI mappers.
		 * @type {Array}
		 * @private
		 */
		this._uriMappers = this._getUriMappers(locator);
	}

	/**
	 * Gets a state by the specified location URI.
	 * @param {URI} location The URI location.
	 * @returns {Object|null} The state object.
	 */
	getStateByUri(location) {
		if (this._uriMappers.length === 0) {
			return null;
		}

		location = location.clone();

		location.path = routeHelper.removeEndSlash(location.path);
		const state = this._mapState(location);
		if (!state) {
			return null;
		}

		// make state object immutable
		Object.keys(state).forEach(storeName => Object.freeze(state[storeName]));
		Object.freeze(state);

		return state;
	}

	/**
	 * Maps the state.
	 * @param {URI} location URI that describes the state.
	 * @returns {Object|null} The state from URI.
	 * @private
	 */
	_mapState(location) {
		var state = null;

		this._uriMappers.some(mapper => {
			if (mapper.expression.test(location.path)) {
				state = mapper.map(location) || Object.create(null);
				return true;
			}
			return false;
		});

		return state;
	}

	/**
	 * Gets a list of URI mappers.
	 * @param {ServiceLocator} serviceLocator The Service locator
	 * for getting route definitions.
	 * @returns {Array} The list of URI mappers.
	 * @private
	 */
	_getUriMappers(serviceLocator) {
		const uriMappers = [];

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
					const routeUri = new URI(route);
					routeUri.path = routeHelper.removeEndSlash(routeUri.path);
					uriMappers.push(routeHelper.compileRoute(routeUri));
					return;
				}

				// extended colon-parametrized mapper
				if (typeof (route) === 'object' &&
					(typeof (route.expression) === 'string') &&
					(route.map instanceof Function)) {

					const mapperUri = new URI(route.expression);
					mapperUri.path = routeHelper.removeEndSlash(mapperUri.path);

					const mapper = routeHelper.compileRoute(mapperUri);

					uriMappers.push({
						expression: mapper.expression,
						map: uri => {
							const state = mapper.map(uri);
							return route.map(state);
						}
					});
					return;
				}

				// regular expression mapper
				if (typeof (route) === 'object' &&
					(route.expression instanceof RegExp) &&
					(route.map instanceof Function)) {
					uriMappers.push(route);
				}
			});
		return uriMappers;
	}
}

module.exports = StateProvider;
