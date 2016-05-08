'use strict';

const uriHelper = require('../helpers/uriHelper');
const catberryUri = require('catberry-uri');
const URI = catberryUri.URI;

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
		 * Current set of named routes.
		 * @type {Object}
		 * @private
		 */
		this._namedRoutes = Object.create(null);

		/**
		 * Current route descriptors.
		 */
		this._routeDescriptors = this._getRouteDescriptors(locator);
		this._routeDescriptors.forEach(descriptor => {
			this._restoreRegularExpressions(descriptor);
			if (typeof (descriptor.name) === 'string') {
				this._namedRoutes[descriptor.name] = descriptor;
			}
		});

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
	 * Gets a URI path string for the named route using specified parameters.
	 * @param {string} name The name of the route.
	 * @param {Object} values The set of parameter values for the route.
	 * @returns {string} URI path string.
	 */
	getRouteURI(name, values) {
		values = values || Object.create(null);
		const descriptor = this._namedRoutes[name];
		if (!descriptor) {
			throw new Error(`There is no such route called "${name}"`);
		}

		const uri = new URI(descriptor.expression);

		// set value to URI path parameters first
		if (descriptor.pathParameters.length > 0) {
			uri.path = setParameterValues(
				uri.path, descriptor.pathParameters, values,
				(parameter, value) => encodeURIComponent(defaultParameterValueProcessor(parameter, value))
			);
		}

		// trying to set query string parameters if they exist
		if (descriptor.queryParameters.length > 0) {
			const queryValues = Object.create(null);

			descriptor.queryParameters.forEach(queryParameter => {
				const name = setParameterValues(
					queryParameter.nameExpression, queryParameter.nameParameters, values
				);

				// if there is no name means there is no query parameter at all
				if (!name) {
					return;
				}

				// if there are no parameter values it means the query
				// parameter does not have value
				if (!queryParameter.valueParameters) {
					queryValues[name] = null;
					return;
				}

				// if there are no route parameters in the query parameter's value
				// that means it has a static value
				if (queryParameter.valueParameters.length === 0) {
					queryValues[name] = queryParameter.valueExpression;
					return;
				}

				const firstParameterName = queryParameter.valueParameters[0].name;
				const firstParameterValue = values[firstParameterName];
				// if there is only one parameter in query value and
				// the specified parameter's value is an array
				if (queryParameter.valueParameters.length === 1 && Array.isArray(firstParameterValue)) {
					queryValues[name] = [];
					firstParameterValue.forEach(value => {
						const valuesObject = Object.create(null);
						valuesObject[firstParameterName] = value;
						const queryValueString = setParameterValues(
							queryParameter.valueExpression, queryParameter.valueParameters, valuesObject
						);
						if (queryValueString.length > 0) {
							queryValues[name].push(queryValueString);
						}
					});
					return;
				}

				const queryValueString = setParameterValues(
					queryParameter.valueExpression, queryParameter.valueParameters, values
				);
				if (queryValueString.length > 0) {
					queryValues[name] = queryValueString;
				}
			});

			if (Object.keys(queryValues).length === 0) {
				uri.query = null;
			} else {
				uri.query.values = queryValues;
			}
		}

		return uri.toString();
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

/**
 * Sets parameter values to a route expression.
 * @param {string} expression The route expression.
 * @param {Array} parameters Array of route parameters.
 * @param {Object} values Dictionary of route parameter values.
 * @param {function?} preProcessor Value preprocessor
 * @returns {string} String with substituted values.
 * @private
 */
function setParameterValues(expression, parameters, values, preProcessor) {
	if (!parameters || parameters.length === 0) {
		return expression;
	}

	preProcessor = preProcessor || defaultParameterValueProcessor;

	// apply values for parameters in the URI path
	let nextParameterIndex = 0;
	let nextParameter = parameters[nextParameterIndex];
	let result = '';

	for (let i = 0; i < expression.length; i++) {
		if (nextParameter && i === nextParameter.start) {
			result += preProcessor(nextParameter, values[nextParameter.name]);
			while (++i < nextParameter.end - 1) {
				// just skipping the parameter in the expression string
			}
			nextParameterIndex++;
			nextParameter = parameters[nextParameterIndex];
			continue;
		}
		result += expression[i];
	}
	return result;
}

/**
 * Processes parameter value by default.
 * @param {Object} parameter Parameter descriptor.
 * @param {*} value Parameter's value.
 * @returns {string} Processed value.
 */
function defaultParameterValueProcessor(parameter, value) {
	if (Array.isArray(value)) {
		throw new Error(`Array value is not supported for the parameter "${parameter.name}"`);
	}
	return value === undefined ? '' : String(value);
}

module.exports = StateProviderBase;
