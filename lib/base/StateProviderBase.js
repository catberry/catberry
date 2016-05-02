'use strict';

const uriHelper = require('../helpers/uriHelper');

/**
 * Implements the state provider for the server environment.
 */
class StateProviderBase {

	/**
	 * Create a new instance of the state provider.
	 * @param {ServiceLocator} locator Service locator for resolving URI mappers.
	 */
	constructor(locator) {

		/**
		 * Current route descriptors.
		 */
		this._routeDescriptors = this._getRouteDescriptors(locator);
		this._routeDescriptors.forEach(descriptor => this._restoreRegularExpressions(descriptor));

		/**
		 * Current list of URI mappers.
		 * @type {Array}
		 * @private
		 */
		this._uriMappers = this._getUriMappers();
	}

	/**
	 * Gets a state by the specified location URI.
	 * @param {URI} uri The URI location.
	 * @returns {Object|null} The state object.
	 */
	getStateByUri(uri) {
		if (this._uriMappers.length === 0) {
			return null;
		}

		uri = uri.clone();
		uri.path = uriHelper.removeEndSlash(uri.path);

		const state = this._mapState(uri);
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
	 * @param {URI} uri URI that describes the state.
	 * @returns {Object|null} The state from URI.
	 * @private
	 */
	_mapState(uri) {
		let state = null;
		this._uriMappers.some(mapper => {
			state = mapper(uri);
			return Boolean(state);
		});

		return state;
	}

	/**
	 * Gets a list of URI mappers.
	 * @returns {Array} The list of URI mappers.
	 * @private
	 */
	_getUriMappers() {
		return this._routeDescriptors.map(descriptor => {
			if (descriptor.expression instanceof RegExp) {
				return uri => descriptor.expression.test(uri.toString()) ? descriptor.map(uri) : null;
			}

			const extractor = this._createParameterExtractor(descriptor);
			if (descriptor.map instanceof Function) {
				return uri => {
					const state = extractor(uri);
					return state ? descriptor.map(state) : state;
				};
			}
			return extractor;
		});
	}

	/**
	 * Gets a list of route descriptors.
	 * @param {ServiceLocator} serviceLocator The Service locator
	 * for getting route definitions.
	 * @returns {Array} The list of route descriptors.
	 * @protected
	 * @abstract
	 */
	_getRouteDescriptors(serviceLocator) {

	}

	/**
	 * Restores all the regular expressions from their sources.
	 * @param {Object} descriptor The route descriptor.
	 * @private
	 */
	_restoreRegularExpressions(descriptor) {

		// because the object is converted to JSON we have to store the
		// regular expressions as their sources
		if (descriptor.pathRegExpSource) {
			descriptor.pathRegExp = new RegExp(descriptor.pathRegExpSource, 'i');
		}
		if (!descriptor.queryParameters) {
			return;
		}
		descriptor.queryParameters.forEach(parameter => {
			parameter.nameRegExp = new RegExp(parameter.nameRegExpSource, 'i');
			if (parameter.valueRegExpSource) {
				parameter.valueRegExp = new RegExp(parameter.valueRegExpSource, 'i');
			}
		});
	}

	/**
	 * Creates a function that extracts parameters from the URI.
	 * @param {Object} routeDescriptor Route descriptor.
	 * @returns {function} Function
	 * @private
	 */
	_createParameterExtractor(routeDescriptor) {
		const pathRegExp = new RegExp(routeDescriptor.pathRegExpSource);
		return uri => {
			const pathMatches = uri.path.match(pathRegExp);
			if (!pathMatches) {
				return null;
			}

			const state = Object.create(null);
			const pathParameterValues = pathMatches.slice(1);

			setStateValues(state, pathParameterValues, routeDescriptor.pathParameters);

			if (uri.query && uri.query.values) {
				setQueryParameters(state, uri.query.values, routeDescriptor);
			}

			return state;
		};
	}
}

/**
 * Sets parameter values to the state using parameter and store names.
 * @param {Object} state Current state object.
 * @param {Array} values Current values.
 * @param {Array} parameters List of parameter descriptors.
 */
function setStateValues(state, values, parameters) {
	values.forEach((value, index) => {
		const parameter = parameters[index];
		parameter.stores.forEach(storeName => {
			if (!(storeName in state)) {
				state[storeName] = Object.create(null);
			}

			// if URI has several values for the same parameter it turns to an array
			if (parameter.name in state[storeName]) {
				if (Array.isArray(state[storeName][parameter.name])) {
					state[storeName][parameter.name].push(value);
				} else {
					state[storeName][parameter.name] = [state[storeName][parameter.name], value];
				}
			} else {
				state[storeName][parameter.name] = value;
			}
		});
	});
}

/**
 * Sets query parameters to the state.
 * @param {Object} state Current state object.
 * @param {Object} queryValues URI query parameters.
 * @param {Object} routeDescriptor Current route descriptor.
 */
function setQueryParameters(state, queryValues, routeDescriptor) {
	Object.keys(queryValues)
		.forEach(name => {
			const value = queryValues[name];

			if (Array.isArray(value)) {
				value.forEach(item => {
					const subValues = Object.create(null);
					subValues[name] = item;
					setQueryParameters(state, subValues, routeDescriptor);
				});
				return;
			}
			const isValue = typeof (value) === 'string';

			let queryNameMatches = null;
			let queryValueMatches = null;
			let routeParameter = null;

			routeDescriptor.queryParameters.some(parameter => {
				queryNameMatches = name.match(parameter.nameRegExp);

				if (isValue && parameter.valueRegExp) {
					queryValueMatches = value.match(parameter.valueRegExp);
				}

				if (queryNameMatches) {
					routeParameter = parameter;
					return true;
				}
				return false;
			});

			if (!routeParameter) {
				return;
			}

			setStateValues(state, queryNameMatches.slice(1), routeParameter.nameParameters);

			if (!queryValueMatches) {
				return;
			}
			setStateValues(state, queryValueMatches.slice(1), routeParameter.valueParameters);
		});
}

module.exports = StateProviderBase;
