'use strict';

const routeHelper = require('../helpers/routeHelper');
const catberryUri = require('catberry-uri');
const RouteParameterTokenizer = require('../tokenizers/RouteExpressionTokenizer');
const URI = catberryUri.URI;

const PATH_SUBSTITUTE_REG_EXP_SOURCE = '([^\\/\\\\]*)';
const SUBSTITUTE_REG_EXP_SOURCE = '(.*)';

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
		 * Current parameter string tokenizer.
		 * @type {RouteParameterTokenizer}
		 * @private
		 */
		this._tokenizer = new RouteParameterTokenizer();

		/**
		 * Current list of URI mappers.
		 * @type {Array}
		 * @private
		 */
		this._uriMappers = this._getUriMappers(locator);
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
		uri.path = routeHelper.removeEndSlash(uri.path);

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
					const descriptor = this._createRouteDescriptor(route);
					uriMappers.push(routeHelper.createParameterExtractor(descriptor));
					return;
				}

				// extended colon-parametrized mapper
				if (typeof (route) === 'object' &&
					(typeof (route.expression) === 'string') &&
					(route.map instanceof Function)) {

					const descriptor = this._createRouteDescriptor(route.expression);
					const extractor = routeHelper.createParameterExtractor(descriptor);
					uriMappers.push(uri => {
						const state = extractor(uri);
						return state ? route.map(state) : state;
					});
					return;
				}

				// regular expression mapper
				if (typeof (route) === 'object' &&
					(route.expression instanceof RegExp) &&
					(route.map instanceof Function)) {
					uriMappers.push(uri => route.expression.test(uri.toString()) ? route.map(uri) : null);
				}
			});
		return uriMappers;
	}

	/**
	 * Creates route descriptor from the route expression.
	 * @param {string} expression Route expression.
	 * @returns {{expression: string, pathParameters: Array, queryParameters: Array, pathRegExp: RegExp}}
	 * Route descriptor.
	 * @private
	 */
	_createRouteDescriptor(expression) {
		const expressionUri = new URI(expression);
		const expressionPath = routeHelper.removeEndSlash(expressionUri.path);

		// finding required parameters in URI path for using the route
		const pathParameters = this._parseExpressionParameters(expressionPath);
		const matchExpression = routeHelper.buildMatcher(expressionPath, pathParameters, PATH_SUBSTITUTE_REG_EXP_SOURCE);

		// finding optional route parameters in query string
		const queryParameters = [];

		if (expressionUri.query && expressionUri.query.values) {
			const queryValues = expressionUri.query.values;
			Object.keys(queryValues)
				.forEach(name => {
					const nameParameters = this._parseExpressionParameters(name);
					const nameRegExp = routeHelper.buildMatcher(name, nameParameters, SUBSTITUTE_REG_EXP_SOURCE);

					const valueParameters = queryValues[name] !== null ?
						this._parseExpressionParameters(queryValues[name]) :
						null;
					const valueRegExp = valueParameters ?
						routeHelper.buildMatcher(queryValues[name], valueParameters, SUBSTITUTE_REG_EXP_SOURCE) :
						null;

					queryParameters.push({
						nameParameters,
						valueParameters,
						nameRegExp,
						valueRegExp
					});
				});

		}

		return {
			expression,
			pathParameters,
			queryParameters,
			pathRegExp: matchExpression
		};
	}

	_parseExpressionParameters(expression) {
		if (!expression) {
			return [];
		}
		const STATES = RouteParameterTokenizer.STATES;

		this._tokenizer.setRouteExpression(expression);

		const parameters = [];
		let currentToken = RouteParameterTokenizer.STATES.NO;
		let currentParameter = routeHelper.createParameterDescriptor();
		let currentStores = Object.create(null);

		do {
			currentToken = this._tokenizer.next();

			switch (currentToken.state) {
				case STATES.PARAMETER_START:
					currentParameter.start = currentToken.start;
					break;
				case STATES.PARAMETER_NAME:
					currentParameter.name = expression.substring(currentToken.start, currentToken.end);
					break;
				case STATES.STORE_LIST_ITEM:
					currentStores[expression.substring(currentToken.start, currentToken.end)] = true;
					break;
				case STATES.TEXT:
					if (currentParameter.start >= 0) {
						currentParameter.end = currentToken.start;
						currentParameter.stores = Object.keys(currentStores);
						currentStores = Object.create(null);
						parameters.push(currentParameter);
						currentParameter = routeHelper.createParameterDescriptor();
					}
					break;
				case STATES.STORE_LIST_END:
					currentParameter.end = currentToken.end;
					currentParameter.stores = Object.keys(currentStores);
					currentStores = Object.create(null);
					parameters.push(currentParameter);
					currentParameter = routeHelper.createParameterDescriptor();
					break;
				case STATES.ILLEGAL:
					const illegal = expression.substring(currentToken.start, currentToken.end);
					const errorMessage = `Illegal character "${illegal}" at ${currentToken.start + 1} in route:\n${expression}\n${createSpaces(currentToken.start)}^`;
					throw new Error(errorMessage);
			}

		} while (currentToken.state !== STATES.END);

		return parameters;
	}
}

/**
 * Creates a string with the specified number of spaces.
 * @param {number} count Number of spaces.
 * @returns {string} The string with specified number of spaces.
 */
function createSpaces(count) {
	let string = '';

	while (count--) {
		string += ' ';
	}
	return string;
}

module.exports = StateProvider;
