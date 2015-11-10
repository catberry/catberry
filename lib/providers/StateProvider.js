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

module.exports = StateProvider;

var routeHelper = require('./../helpers/routeHelper'),
	catberryUri = require('catberry-uri'),
	URI = catberryUri.URI;

/**
 * Create new instance of the state provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve URI mappers.
 * @constructor
 */
function StateProvider($serviceLocator) {
	this._uriMappers = getUriMappers($serviceLocator);
}

/**
 * Current list of URI mappers.
 * @type {Array}
 * @private
 */
StateProvider.prototype._uriMappers = null;

/**
 * Gets state by specified location URI.
 * @param {URI} location URI location.
 * @returns {Object?} State object.
 */
StateProvider.prototype.getStateByUri = function (location) {
	if (this._uriMappers.length === 0) {
		return null;
	}

	location = location.clone();

	location.path = routeHelper.removeEndSlash(location.path);
	var state = getState(this._uriMappers, location);

	if (!state) {
		return null;
	}

	// make state object immutable
	Object.keys(state)
		.forEach(function (storeName) {
			Object.freeze(state[storeName]);
		});
	Object.freeze(state);

	return state;
};

/**
 * Gets list of URI mappers.
 * @param {ServiceLocator} serviceLocator Service locator to get route
 * definitions.
 * @returns {Array} List of URI mappers.
 */
function getUriMappers(serviceLocator) {
	var uriMappers = [];

	serviceLocator.resolveAll('routeDefinition')
		.forEach(function (route) {
			// just colon-parametrized string
			if (typeof (route) === 'string') {
				var routeUri = new URI(route);
				routeUri.path = routeHelper.removeEndSlash(routeUri.path);
				uriMappers.push(routeHelper.compileRoute(routeUri));
				return;
			}

			// extended colon-parametrized mapper
			if (typeof (route) === 'object' &&
				(typeof (route.expression) === 'string') &&
				(route.map instanceof Function)) {
				var mapperUri = new URI(route.expression);
				mapperUri.path = routeHelper.removeEndSlash(mapperUri.path);
				var mapper = routeHelper.compileRoute(mapperUri);
				uriMappers.push({
					expression: mapper.expression,
					map: function (uri) {
						var state = mapper.map(uri);
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

/**
 * Gets state.
 * @param {Array} uriMappers List of URI mappers.
 * @param {URI} location URI that describes the state.
 * @returns {Object|null} The state from URI.
 */
function getState(uriMappers, location) {
	var state = null;

	uriMappers.some(function (mapper) {
		if (mapper.expression.test(location.path)) {
			state = mapper.map(location) || Object.create(null);
			return true;
		}
		return false;
	});

	return state;
}