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

module.exports = ModuleLoader;

var util = require('util'),
	ModuleLoaderBase = require('../ModuleLoaderBase'),
	propertyHelper = require('../helpers/propertyHelper'),
	moduleHelper = require('../helpers/moduleHelper');

util.inherits(ModuleLoader, ModuleLoaderBase);

/**
 * Creates new instance of client-side module loader.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve modules.
 * @extends ModuleLoaderBase
 * @constructor
 */
function ModuleLoader($serviceLocator) {
	ModuleLoaderBase.call(this, $serviceLocator);
	this._stateProvider = $serviceLocator.resolve('stateProvider');
	this._window = $serviceLocator.resolve('window');
	this._moduleApiProvider = $serviceLocator.resolve('moduleApiProvider');
	this.lastRenderedData = this._window.__cache || {};
	delete this._window.__cache;

	this._initModules();
}

/**
 * Current state provider.
 * @type {StateProvider}
 * @private
 */
ModuleLoader.prototype._stateProvider = null;

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
ModuleLoader.prototype._window = null;

/**
 * Current module API provider.
 * @type {ModuleApiProvider}
 * @private
 */
ModuleLoader.prototype._moduleApiProvider = null;

/**
 * Map of data contexts by module names with last rendered data for each module.
 * @type {Object}
 */
ModuleLoader.prototype.lastRenderedData = null;

/**
 * Gets all modules registered in service locator.
 * Loads and initializes it if required.
 * @returns {Object} Set of loaded modules.
 */
ModuleLoader.prototype.getModulesByNames = function () {
	return this._loadedModules || {};
};

/**
 * Initializes all registered modules.
 * @private
 */
ModuleLoader.prototype._initModules = function () {
	var self = this,
		modules = {};
	this._serviceLocator
		.resolveAll('placeholder')
		.forEach(function (placeholder) {
			if (!modules.hasOwnProperty(placeholder.moduleName)) {
				modules[placeholder.moduleName] = {
					placeholders: {}
				};
			}
			var module = modules[placeholder.moduleName],
				fullName = moduleHelper.joinModuleNameAndContext(
					placeholder.moduleName,
					placeholder.name);

			self._templateProvider.registerCompiled(fullName,
				placeholder.compiledSource);

			if (moduleHelper.isRootPlaceholder(placeholder.name)) {
				return;
			}

			placeholder.fullName = fullName;
			placeholder.render = function (dataContext) {
				return self._templateProvider.render(fullName, dataContext);
			};

			if (moduleHelper.isErrorPlaceholder(placeholder.name)) {
				module.errorPlaceholder = placeholder;
			} else {
				module.placeholders[placeholder.name] = placeholder;
			}

			self._eventBus.emit('placeholderLoaded', {
				name: placeholder.name,
				moduleName: placeholder.moduleName
			});
		});

	var currentState = this._stateProvider.getStateByUrl(
			this._window.location.toString()
		),
		cookiesWrapper = this._serviceLocator.resolve('cookiesWrapper');

	this._serviceLocator
		.resolveAll('module')
		.forEach(function (module) {
			if (!modules.hasOwnProperty(module.name)) {
				modules[module.name] = {
					placeholders: {}
				};
			}

			var context = Object.create(self._moduleApiProvider);
			context.name = module.name;
			context.cookies = cookiesWrapper;
			context.renderedData = self.lastRenderedData;
			context.state = currentState[module.name] || {};
			propertyHelper.defineReadOnly(context, 'referrer',
				self._window.document.referrer
			);
			propertyHelper.defineReadOnly(context, 'userAgent',
				self._window.navigator.userAgent
			);
			propertyHelper.defineReadOnly(context, 'urlPath',
					self._window.location.pathname +
					self._window.location.search
			);

			module.implementation =
				(module.implementation instanceof Function) ?
					module.implementation : Object;
			// set initial context
			module.implementation.prototype.$context = context;

			var implementation = self._serviceLocator.resolveInstance(
				module.implementation, self._config
			);

			if (!implementation.$context) {
				implementation.$context = context;
			}
			modules[module.name].name = module.name;
			modules[module.name].implementation = implementation;
			self._eventBus.emit('moduleLoaded', module.name);
		});

	this._loadedModules = modules;
	this._eventBus.emit('allModulesLoaded');
};