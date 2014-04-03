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

module.exports = ModuleApiProvider;

var util = require('util');

var TRACE_MODULE_REQUESTS_REFRESH =
		'Module "%s" requests to refresh placeholder "%s"',
	ERROR_WRONG_MODULE_REFERENCE = 'Wrong module reference',
	ERROR_WRONG_PLACEHOLDER_NAME = 'Wrong placeholder name "%s"';

/**
 * Creates new instance of module API provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve a lot of services.
 * @constructor
 */
function ModuleApiProvider($serviceLocator) {
	this._serviceLocator = $serviceLocator;
	this._logger = $serviceLocator.resolve('logger');
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
ModuleApiProvider.prototype._serviceLocator = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ModuleApiProvider.prototype._logger = null;

/**
 * Redirects current page to specified URL.
 * @param {string} locationUrl URL to direct.
 */
ModuleApiProvider.prototype.redirect = function (locationUrl) {
	var requestRouter = this._serviceLocator.resolve('requestRouter');
	requestRouter.go(locationUrl);
};

/**
 * Requests refresh of module's placeholder.
 * @param {Object} moduleReference Reference to any module implementation.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @param {Function} callback Callback on finish.
 */
ModuleApiProvider.prototype.requestRefresh =
	function (moduleReference, placeholderName, callback) {
		callback = callback instanceof Function ? callback : dummy;

		var moduleLoader = this._serviceLocator.resolve('moduleLoader'),
			modulesByNames = moduleLoader.getModulesByNames(),
			module = findModule(moduleReference, modulesByNames);
		if (!module) {
			throw new Error(ERROR_WRONG_MODULE_REFERENCE);
		}

		var placeholder = module.placeholders[placeholderName];
		if (!placeholder) {
			throw new Error(util.format(ERROR_WRONG_PLACEHOLDER_NAME,
				placeholderName));
		}

		this._logger.trace(util.format(TRACE_MODULE_REQUESTS_REFRESH,
			module.name, placeholder.name
		));
		var pageRenderer = this._serviceLocator.resolve('pageRenderer'),
			stateProvider = this._serviceLocator.resolve('stateProvider'),
			currentState = stateProvider.getCurrentState();

		pageRenderer.renderPlaceholder(
			placeholder, currentState, {}, callback);
	};

/**
 * Finds module information by its implementation reference.
 * @param {Object} moduleReference Reference to implementation.
 * @param {Object} modulesByNames Map of modules by names.
 * @returns {Object|null} Module information.
 */
function findModule(moduleReference, modulesByNames) {
	var moduleNames = Object.keys(modulesByNames),
		currentModule;

	for (var i = 0; i < moduleNames.length; i++) {
		currentModule = modulesByNames[moduleNames[i]];
		if (currentModule.implementation === moduleReference) {
			return currentModule;
		}
	}

	return null;
}

/**
 * Does nothing and is used as default callback.
 */
function dummy() {}