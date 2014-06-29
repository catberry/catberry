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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var EXPRESSION_ESCAPE_REG_EXP = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
	IDENTIFIER_REG_EXP_SOURCE = '[$A-Z_][\\dA-Z_$]*',
	MODULE_LIST_REG_EXP_SOURCE = '\\\\[[ ]*' +
		IDENTIFIER_REG_EXP_SOURCE +
		'([ ]*,[ ]*' +
		IDENTIFIER_REG_EXP_SOURCE +
		')*[ ]*\\\\]',
	PARAMETER_REG_EXP = new RegExp(
			':' + IDENTIFIER_REG_EXP_SOURCE + MODULE_LIST_REG_EXP_SOURCE, 'gi'),
	EVENT_PARAMETER_REG_EXP = new RegExp(':' + IDENTIFIER_REG_EXP_SOURCE, 'gi'),
	REPLACEMENT_REG_EXP_SOURCE = '([\\w\\d]*)',
	SLASHED_BRACKETS_REG_EXP = /\\\[|\\\]/,
	BRACKETS_REG_EXP = /\[|\]/,
	EVENT_RULE_SEPARATOR = '->',
	MODULE_LIST_SEPARATOR = ',';

module.exports = {
	/**
	 * Gets URL mapper from route expression like
	 * /some/:id[module1, module2, module3]/details?filter=:filter[module3]
	 * @param {string} routeExpression Expression that defines route.
	 * @returns {{expression: RegExp, map: Function}} URL mapper object.
	 */
	getUrlMapperByRoute: function (routeExpression) {
		if (!routeExpression || typeof(routeExpression) !== 'string') {
			return null;
		}

		// escape regular expression characters
		routeExpression = routeExpression.replace(
			EXPRESSION_ESCAPE_REG_EXP, '\\$&');

		// get all occurrences of routing parameters
		var regExpSource = '^' + routeExpression.replace(
				PARAMETER_REG_EXP,
				REPLACEMENT_REG_EXP_SOURCE) + '$',
			parameterMatches = routeExpression.match(PARAMETER_REG_EXP),
			parameters = !parameterMatches || parameterMatches.length === 0 ?
				[] :
				parameterMatches.map(getParameterDescription);

		var expression = new RegExp(regExpSource, 'i');
		return createUrlMapperFromExpression(expression, parameters);
	},
	/**
	 * Gets event mappers for specified rule.
	 * @param {string} rule Event route rule like below:
	 * expressionWithColonParameters->eventName[module1, module2, module3]
	 * @returns {{expression: RegExp, map: Function}} Event mapper object.
	 */
	getEventMapperByRule: function (rule) {
		if (!rule || typeof(rule) !== 'string') {
			return null;
		}

		var parts = rule.split(EVENT_RULE_SEPARATOR);
		if (parts.length !== 2) {
			return null;
		}

		var parametrized = parts[0].trim(),
			eventDeclaration = parts[1].trim();

		// escape regular expression characters
		parametrized = parametrized.replace(EXPRESSION_ESCAPE_REG_EXP, '\\$&');

		// get all occurrences of routing parameters
		var regExpSource = '^' + parametrized.replace(
				EVENT_PARAMETER_REG_EXP,
				REPLACEMENT_REG_EXP_SOURCE) + '$',
			parameterMatches = parametrized.match(EVENT_PARAMETER_REG_EXP),
			parameters = (parameterMatches || []).map(function (parameterName) {
				return parameterName.trim().substring(1);
			});

		var eventDeclarationParts = eventDeclaration
			.split(BRACKETS_REG_EXP);

		if (!eventDeclarationParts || eventDeclarationParts.length < 2) {
			return null;
		}

		var eventName = eventDeclarationParts[0].trim(),
			moduleNames = eventDeclarationParts[1]
				.split(MODULE_LIST_SEPARATOR)
				.map(function (moduleName) {
					return moduleName.trim();
				});

		var expression = new RegExp(regExpSource, 'i');
		return createEventMapperFromExpression(eventName, moduleNames,
			expression, parameters);
	}
};

/**
 * Gets description of parameters from its expression.
 * @param {string} parameter Parameter expression.
 * @returns {{name: string, moduleNames:Array}} Parameter descriptor.
 */
function getParameterDescription(parameter) {
	var result = {},
		parts = parameter.split(SLASHED_BRACKETS_REG_EXP);

	result.name = parts[0]
		.trim()
		.substring(1);
	result.moduleNames = parts[1]
		.split(MODULE_LIST_SEPARATOR)
		.map(function (moduleName) {
			return moduleName.trim();
		});
	return result;
}

/**
 * Creates new URL to state object mapper.
 * @param {RegExp} expression Regular expression to check URLs.
 * @param {Array} parameters List of parameter descriptors.
 * @returns {{expression: RegExp, map: Function}} URL mapper object.
 */
function createUrlMapperFromExpression(expression, parameters) {
	return {
		expression: expression,
		map: function (url) {
			var matches = url.match(expression),
				state = {};

			if (!matches || matches.length < 2) {
				return state;
			}

			// start with second match because first match is always
			// the whole URL
			matches = matches.splice(1);

			parameters.forEach(function (parameter, index) {
				parameter.moduleNames.forEach(function (moduleName) {
					if (!state[moduleName]) {
						state[moduleName] = {};
					}
					state[moduleName][parameter.name] =
						matches[index];
				});
			});

			return state;
		}
	};
}

/**
 * Creates new event name to parameter object mapper.
 * @param {string} eventName Name of event for mapper.
 * @param {Array} moduleNames Module names for event routing.
 * @param {RegExp} expression Regular expression to check URLs.
 * @param {Array} parameterNames List of parameter names.
 * @returns {{
 * eventName:string,
 * moduleNames: Array,
 * expression: RegExp,
 * map: Function}} URL mapper object.
 */
function createEventMapperFromExpression(eventName, moduleNames, expression,
	parameterNames) {
	return {
		eventName: eventName,
		moduleNames: moduleNames,
		expression: expression,
		map: function (event) {
			var matches = event.match(expression),
				parameters = {};

			if (!matches || matches.length < 2) {
				return parameters;
			}

			// start with second match because first match is always
			// the whole URL
			matches = matches.splice(1);

			parameterNames.forEach(function (parameterName, index) {
				parameters[parameterName] = matches[index];
			});

			return parameters;
		}
	};
}
