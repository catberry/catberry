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

module.exports = StateProvider;

var routeHelper = require('./helpers/routeHelper'),
	url = require('url');

/**
 * Create new instance of state provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve URL mappers.
 * @constructor
 */
function StateProvider($serviceLocator) {
	this._urlMappers = getUrlMappers($serviceLocator);
}

/**
 * Current list of URL mappers.
 * @type {Array}
 * @private
 */
StateProvider.prototype._urlMappers = null;

/**
 * Gets state by specified location URL.
 * @param {string} urlLocation URL location.
 * @returns {Object} State object.
 */
StateProvider.prototype.getStateByUrl = function (urlLocation) {
	if (this._urlMappers.length === 0) {
		return {};
	}

	var urlInfo = url.parse(urlLocation);

	if (urlInfo.pathname[urlInfo.pathname.length - 1] !== '/') {
		urlInfo.pathname += '/';
	}

	var currentPath =
			String(urlInfo.pathname || '') +
			String(urlInfo.search || ''),
		state = null;

	for (var i = 0; i < this._urlMappers.length; i++) {
		if (!this._urlMappers[i].expression.test(currentPath)) {
			continue;
		}

		state = this._urlMappers[i].map(currentPath);
		break;
	}

	if (!state) {
		return null;
	}

	// make state object immutable
	Object.keys(state)
		.forEach(function (moduleName) {
			Object.freeze(state[moduleName]);
		});
	Object.freeze(state);

	return state;
};

/**
 * Gets list of URL mappers.
 * @param {ServiceLocator} serviceLocator Service locator to get route
 * definitions.
 * @returns {Array}
 */
function getUrlMappers(serviceLocator) {
	var urlMappers = [];

	serviceLocator
		.resolveAll('routeDefinition')
		.forEach(function (route) {
			// just colon-parametrized string
			if (typeof(route) === 'string') {
				urlMappers.push(routeHelper.getMapperByRoute(route));
				return;
			}

			// extended colon-parametrized mapper
			if (typeof(route) === 'object' &&
				(typeof(route.expression) === 'string') &&
				(route.map instanceof Function)) {
				var mapper = routeHelper.getMapperByRoute(route.expression);
				urlMappers.push({
					expression: mapper.expression,
					map: function (urlPath) {
						var state = mapper.map(urlPath);
						return route.map(state);
					}
				});
				return;
			}

			// regular expression mapper
			if (typeof(route) === 'object' &&
				(route.expression instanceof RegExp) &&
				(route.map instanceof Function)) {
				urlMappers.push(route);
			}
		});
	return urlMappers;
}