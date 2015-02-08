/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/,
	EXPRESSION_ESCAPE_REG_EXP = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
	IDENTIFIER_REG_EXP_SOURCE = '[$A-Z_][\\dA-Z_$]*',
	STORE_LIST_REG_EXP_SOURCE = '(?:(?:\\\\[[ ]*' +
		'[^\\[\\],]+' +
		'([ ]*,[ ]*' +
		'[^\\[\\],]+' +
		')*[ ]*\\\\])|(?:\\\\[[ ]*\\\\]))?',
	PARAMETER_REG_EXP = new RegExp(
			':' +
			IDENTIFIER_REG_EXP_SOURCE +
			STORE_LIST_REG_EXP_SOURCE, 'gi'),
	URI_REPLACEMENT_REG_EXP_SOURCE = '([^\\/\\\\&\\?=]*)',
	SLASHED_BRACKETS_REG_EXP = /\\\[|\\\]/,
	STORE_LIST_SEPARATOR = ',';

module.exports = {
	/**
	 * Removes slash from the end of URI path.
	 * @param {string} uriPath URI path to process.
	 * @returns {string}
	 */
	removeEndSlash: function (uriPath) {
		if (!uriPath || typeof(uriPath) !== 'string') {
			return '';
		}
		if (uriPath === '/') {
			return uriPath;
		}
		return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
	},
	/**
	 * Gets URI mapper from the route expression like
	 * /some/:id[store1, store2, store3]/details?filter=:filter[store3]
	 * @param {string} routeExpression Expression that defines route.
	 * @returns {{expression: RegExp, map: Function}} URI mapper object.
	 */
	getUriMapperByRoute: function (routeExpression) {
		if (!routeExpression || typeof(routeExpression) !== 'string') {
			return null;
		}

		routeExpression = module.exports.removeEndSlash(routeExpression);

		// escape regular expression characters
		routeExpression = routeExpression.replace(
			EXPRESSION_ESCAPE_REG_EXP, '\\$&');

		// get all occurrences of routing parameters
		var regExpSource = '^' + routeExpression.replace(
				PARAMETER_REG_EXP,
				URI_REPLACEMENT_REG_EXP_SOURCE) + '$',
			parameterMatches = routeExpression.match(PARAMETER_REG_EXP),
			parameters = !parameterMatches || parameterMatches.length === 0 ?
				[] : parameterMatches.map(getParameterDescription);

		var expression = new RegExp(regExpSource, 'i');
		return createUriMapperFromExpression(expression, parameters);
	}
};

/**
 * Gets description of parameters from its expression.
 * @param {string} parameter Parameter expression.
 * @returns {{name: string, storeNames: Array}} Parameter descriptor.
 */
function getParameterDescription(parameter) {
	var parts = parameter.split(SLASHED_BRACKETS_REG_EXP);

	return {
		name: parts[0]
			.trim()
			.substring(1),
		storeNames: (parts[1] ? parts[1] : '')
			.split(STORE_LIST_SEPARATOR)
			.map(function (storeName) {
				return storeName.trim();
			})
			.filter(function (storeName) {
				return storeName.length > 0;
			})
	};
}

/**
 * Creates new URI-to-state object mapper.
 * @param {RegExp} expression Regular expression to check URIs.
 * @param {Array} parameters List of parameter descriptors.
 * @returns {{expression: RegExp, map: Function}} URI mapper object.
 */
function createUriMapperFromExpression(expression, parameters) {
	return {
		expression: expression,
		map: function (uri) {
			var matches = uri.match(expression),
				state = {};

			if (!matches || matches.length < 2) {
				return state;
			}

			// start with second match because first match is always
			// the whole URI
			matches = matches.splice(1);

			parameters.forEach(function (parameter, index) {
				parameter.storeNames.forEach(function (storeName) {
					if (!state[storeName]) {
						state[storeName] = {};
					}
					state[storeName][parameter.name] =
						matches[index];
				});
			});

			return state;
		}
	};
}