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

var util = require('util');

var PLACEHOLDER_FULL_NAME_FORMAT = '%s_%s',
	INFO_PLACEHOLDER_LOADED = 'Placeholder "%s" of module "%s" loaded',
	INFO_MODULE_LOADED = 'Module "%s" loaded',
	INFO_ALL_MODULES_LOADED = 'All modules loaded';

/**
 * Creates new instance of client-side module loader.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve modules.
 * @param {TemplateProvider} $templateProvider Template provider to
 * register and get template streams.
 * @param {Logger} $logger Logger to log messages.
 * @constructor
 */
function ModuleLoader($serviceLocator, $templateProvider, $logger) {
	this._serviceLocator = $serviceLocator;
	this._templateProvider = $templateProvider;
	this._logger = $logger;
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
ModuleLoader.prototype._serviceLocator = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ModuleLoader.prototype._templateProvider = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ModuleLoader.prototype._logger = null;

/**
 * Current module loader.
 * @type {ModuleLoader}
 * @private
 */
ModuleLoader.prototype._loadedModules = null;

/**
 * Loads and initialize all modules registered in service locator.
 * @returns {Object}
 */
ModuleLoader.prototype.loadModules = function () {
	if (this._loadedModules) {
		return this._loadedModules;
	}
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
				fullName = util.format(PLACEHOLDER_FULL_NAME_FORMAT,
					placeholder.moduleName,
					placeholder.name);

			this._templateProvider.register(fullName,
				placeholder.compiledTemplate);

			module.placeholders[placeholder.name] = placeholder;

			placeholder.getTemplateStream = function (data) {
				return self._templateProvider.getStream(fullName, data);
			};
			self._logger.info(util.format(INFO_PLACEHOLDER_LOADED,
				placeholder.name,
				placeholder.moduleName
			));
		});

	this._serviceLocator
		.resolveAll('module')
		.forEach(function (module) {
			if (!modules.hasOwnProperty(module.name)) {
				modules[module.name] = {
					placeholders: {}
				};
			}

			modules[module.name].name = module.name;
			modules[module.name].implementation = module;
			self._logger.info(util.format(INFO_MODULE_LOADED, module.name));
		});

	this._loadedModules = modules;
	self._logger.info(INFO_ALL_MODULES_LOADED);

	return modules;
};