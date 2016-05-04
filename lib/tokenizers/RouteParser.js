'use strict';

const uriHelper = require('../helpers/uriHelper');
const catberryUri = require('catberry-uri');
const RouteParameterTokenizer = require('./RouteExpressionTokenizer');
const URI = catberryUri.URI;

const PATH_SUBSTITUTE_REG_EXP_SOURCE = '([^\\/\\\\]*)';
const SUBSTITUTE_REG_EXP_SOURCE = '(.*)';
const REG_EXP_ESCAPE = /[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/;

/**
 * Implements the route parser for the server environment.
 */
class RouteParser {

	/**
	 * Creates a new instance of the route parser.
	 */
	constructor() {

		/**
		 * Current parameter string tokenizer.
		 * @type {RouteParameterTokenizer}
		 * @private
		 */
		this._tokenizer = new RouteParameterTokenizer();
	}

	/**
	 * Creates route descriptor from the route expression.
	 * @param {string} expression Route expression.
	 * @returns {{expression: string, pathParameters: Array, queryParameters: Array, pathRegExpSource: string}}
	 * Route descriptor.
	 * @private
	 */
	parseRouteExpression(expression) {
		const expressionUri = new URI(expression);
		const expressionPath = uriHelper.removeEndSlash(expressionUri.path);

		// finding required parameters in URI path for using the route
		const pathParameters = this._parseExpressionParameters(expressionPath);
		const matchExpression = buildMatcher(expressionPath, pathParameters, PATH_SUBSTITUTE_REG_EXP_SOURCE);

		// finding optional route parameters in query string
		const queryParameters = [];

		if (expressionUri.query && expressionUri.query.values) {
			const queryValues = expressionUri.query.values;
			Object.keys(queryValues)
				.forEach(name => {
					const nameParameters = this._parseExpressionParameters(name);
					const nameRegExpSource = buildMatcher(name, nameParameters, SUBSTITUTE_REG_EXP_SOURCE);

					const valueParameters = queryValues[name] !== null ?
						this._parseExpressionParameters(queryValues[name]) :
						null;
					const valueRegExpSource = valueParameters ?
						buildMatcher(queryValues[name], valueParameters, SUBSTITUTE_REG_EXP_SOURCE) :
						null;

					queryParameters.push({
						nameExpression: name,
						valueExpression: queryValues[name],
						nameParameters,
						valueParameters,
						nameRegExpSource,
						valueRegExpSource
					});
				});

		}

		return {
			expression,
			pathParameters,
			queryParameters,
			pathRegExpSource: matchExpression
		};
	}

	/**
	 * Parses parameters from a route expression.
	 * @param {string} expression The route expression.
	 * @returns {Array} List of parameter descriptors.
	 * @private
	 */
	_parseExpressionParameters(expression) {
		if (!expression) {
			return [];
		}
		const STATES = RouteParameterTokenizer.STATES;

		this._tokenizer.setRouteExpression(expression);

		const parameters = [];
		let currentToken = RouteParameterTokenizer.STATES.NO;
		let currentParameter = createParameterDescriptor();
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
						currentParameter = createParameterDescriptor();
					}
					break;
				case STATES.STORE_LIST_END:
					currentParameter.end = currentToken.end;
					currentParameter.stores = Object.keys(currentStores);
					currentStores = Object.create(null);
					parameters.push(currentParameter);
					currentParameter = createParameterDescriptor();
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
 * Builds a regular expression for matching the actual URL parts
 * @param {string} expression Routing expression.
 * @param {Array} parameters List of extracted parameters.
 * @param {string} substitute Regular expression source for the
 * substitute of the parameter's value.
 * @returns {string} Regular expression source.
 */
function buildMatcher(expression, parameters, substitute) {
	let regExpSource = '^';
	let nextParameterIndex = 0;
	let nextParameter = parameters[nextParameterIndex];

	for (let i = 0; i < expression.length; i++) {

		if (nextParameter && i === nextParameter.start) {
			while (++i < nextParameter.end - 1) {
				// just skipping the parameter in the expression string
			}
			nextParameterIndex++;
			nextParameter = parameters[nextParameterIndex];
			regExpSource += substitute;
			continue;
		}

		const current = expression[i];

		if (REG_EXP_ESCAPE.test(current)) {
			regExpSource += `\\${current}`;
			continue;
		}

		regExpSource += current;
	}

	regExpSource += '$';
	return regExpSource;
}

/**
 * Creates a new parameter descriptor.
 * @returns {{start: number, end: number, name: null, stores: {}}}
 */
function createParameterDescriptor() {
	return {
		start: -1,
		end: -1,
		name: null,
		stores: Object.create(null)
	};
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

module.exports = RouteParser;
