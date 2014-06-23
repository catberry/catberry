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

var fs = require('fs'),
	util = require('util'),
	path = require('path'),
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	DummyModule = require('../DummyModule');

var ERROR_MODULE_SHOULD_EXPORT_CONSTRUCTOR = 'Module should export constructor',
	WARN_MODULE_INDEX_NOT_FOUND =
		'Module "%s" do not have index.js, using empty module instead',
	INFO_MODULE_LOADED = 'Module "%s" loaded',
	INFO_WATCHING_FILES = 'Watching files for changes to reload placeholders',
	INFO_FILES_CHANGED = 'Files were changed, reloading placeholders',
	INFO_PLACEHOLDER_LOADED = 'Placeholder "%s" loaded',
	INFO_ALL_MODULES_LOADED = 'All modules loaded';

/**
 * Creates new instance of module loader.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve modules.
 * @param {TemplateProvider} $templateProvider Provider to compile templates.
 * @param {Logger} $logger Logger to log messages.
 * @param {ModuleFinder} $moduleFinder Module finder to find module paths.
 * @param {Object} $config Current configuration object to pass to modules.
 * @constructor
 */
function ModuleLoader($serviceLocator, $templateProvider, $logger,
	$moduleFinder, $config) {
	this._logger = $logger;
	this._config = $config;
	this._serviceLocator = $serviceLocator;
	this._templateProvider = $templateProvider;
	this._moduleFinder = $moduleFinder;
}

/**
 * Set of loaded modules.
 * @type {Object}
 * @private
 */
ModuleLoader.prototype._loadedModules = null;

/**
 * Current logger.
 * @type {Logger}
 * @protected
 */
ModuleLoader.prototype._logger = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @protected
 */
ModuleLoader.prototype._serviceLocator = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @protected
 */
ModuleLoader.prototype._templateProvider = null;

/**
 * Current config.
 * @type {Object}
 * @protected
 */
ModuleLoader.prototype._config = null;

/**
 * Current module finder.
 * @type {string}
 * @private
 */
ModuleLoader.prototype._moduleFinder = '';

/**
 * Loads and initializes all modules.
 * @param {Function} callback Callback on finish.
 */
ModuleLoader.prototype.loadModules = function (callback) {
	var self = this,
		modules = {};
	this._moduleFinder.find(function (found) {
		Object.keys(found)
			.forEach(function (moduleName) {
				var moduleImplementation;
				if (typeof(found[moduleName].indexPath) === 'string') {
					try {
						var moduleConstructor = require(
							found[moduleName].indexPath);
						checkModuleInterface(moduleConstructor);

						moduleImplementation = self._serviceLocator
							.resolveInstance(moduleConstructor, self._config);
					} catch (e) {
						self._logger.error(e);
						return;
					}
				} else {
					self._logger.warn(util.format(
						WARN_MODULE_INDEX_NOT_FOUND, moduleName));
				}

				var module = {
					name: moduleName,
					implementation: moduleImplementation || new DummyModule(),
					placeholders: {}
				};

				modules[moduleName] = module;
				self._logger.info(util.format(INFO_MODULE_LOADED,
					moduleName));

				self._loadPlaceholders(module, found[moduleName].placeholders);
			});

		self._loadedModules = modules;
		self._logger.info(INFO_ALL_MODULES_LOADED);

		callback(modules);

		if (!self._config.isRelease) {
			self._logger.info(INFO_WATCHING_FILES);
			self._moduleFinder.watch(function (found) {
				self._logger.info(INFO_FILES_CHANGED);
				self._updatePlaceholders(found);
			});
		}
	});
};

/**
 * Gets all modules in current folder.
 * Loads and initializes it if required.
 * @returns {Object} Set of loaded modules.
 */
ModuleLoader.prototype.getModulesByNames = function () {
	return this._loadedModules;
};

/**
 * Updates placeholders in loaded modules.
 * @param {Object} found Found paths.
 * @private
 */
ModuleLoader.prototype._updatePlaceholders = function (found) {
	var self = this;
	Object.keys(found)
		.forEach(function (moduleName) {
			if (!(moduleName in self._loadedModules)) {
				return;
			}
			self._loadPlaceholders(self._loadedModules[moduleName],
				found[moduleName].placeholders);
		});
};

/**
 * Loads placeholders from found paths.
 * @param {Object} module Loaded module Object.
 * @param {Object} placeholders Found placeholders paths.
 * @private
 */
ModuleLoader.prototype._loadPlaceholders = function (module, placeholders) {
	var self = this;
	Object.keys(placeholders)
		.forEach(function (placeholderName) {
			var fullName = moduleContextHelper
				.joinModuleNameAndContext(module.name,
				placeholderName);

			var source = fs.readFileSync(
				placeholders[placeholderName],
				{encoding: 'utf8'});
			self._templateProvider.registerSource(fullName, source);

			self._logger.info(util.format(
				INFO_PLACEHOLDER_LOADED,
				fullName));

			var placeholder = {
				moduleName: module.name,
				name: placeholderName,
				getTemplateStream: function (data) {
					return self._templateProvider.getStream(
						fullName, data);
				}
			};
			if (moduleContextHelper.isRootPlaceholder(placeholderName)) {
				module.rootPlaceholder = placeholder;
				module.rootPlaceholder.name = placeholderName;
				return;
			}

			if (moduleContextHelper.isErrorPlaceholder(placeholderName)) {
				module.errorPlaceholder = placeholder;
				module.rootPlaceholder.name = placeholderName;
				return;
			}

			module.placeholders[placeholderName] = placeholder;
		});
};

/**
 * Checks module constructor is it according to required interface.
 * @param {Function} moduleConstructor Module constructor.
 */
function checkModuleInterface(moduleConstructor) {
	if (!(moduleConstructor instanceof Function)) {
		throw new Error(ERROR_MODULE_SHOULD_EXPORT_CONSTRUCTOR);
	}

	if (!(moduleConstructor.prototype.render instanceof Function)) {
		moduleConstructor.prototype.render = DummyModule.prototype.render;
	}

	if (!(moduleConstructor.prototype.handle instanceof Function)) {
		moduleConstructor.prototype.handle = DummyModule.prototype.handle;
	}

	if (!(moduleConstructor.prototype.submit instanceof Function)) {
		moduleConstructor.prototype.submit = DummyModule.prototype.submit;
	}
}