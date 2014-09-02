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

var fs = require('./promises/fs'),
	util = require('util'),
	path = require('path'),
	moduleHelper = require('../helpers/moduleHelper'),
	ModuleLoaderBase = require('../ModuleLoaderBase');

var WARN_MODULE_INDEX_NOT_FOUND =
		'Module "%s" does not have "index.js", using empty module instead',
	INFO_WATCHING_FILES = 'Watching files for changes ' +
		'to reload placeholders and modules',
	INFO_FILES_CHANGED = 'Files were changed, ' +
		'reloading placeholders and modules';

util.inherits(ModuleLoader, ModuleLoaderBase);

/**
 * Creates new instance of module loader.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve modules.
 * @param {Logger} $logger Logger to log warn and info messages.
 * @extends ModuleLoaderBase
 * @constructor
 */
function ModuleLoader($serviceLocator, $logger) {
	ModuleLoaderBase.call(this, $serviceLocator);
	this._moduleFinder = $serviceLocator.resolve('moduleFinder');
	this._logger = $logger;
	var self = this;
	if (!this._config.isRelease) {
		this._logger.info(INFO_WATCHING_FILES);
		this._moduleFinder.watch(function () {
			self._logger.info(INFO_FILES_CHANGED);
			// clear require cache to load modules again
			Object.keys(require.cache)
				.forEach(function (key) {
					delete require.cache[key];
				});
			self.loadModules();
		});
	}
}

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ModuleLoader.prototype._logger = null;

/**
 * Current module finder.
 * @type {string}
 * @private
 */
ModuleLoader.prototype._moduleFinder = '';

/**
 * Loads and initializes all modules.
 * @returns {Promise<Object>} Promise for object with modules.
 */
ModuleLoader.prototype.loadModules = function () {
	var self = this,
		modules = {};
	return this._moduleFinder.find()
		.then(function (found) {
			return Promise.all(Object
				.keys(found)
				.map(function (moduleName) {
					modules[moduleName] = self._getModule(found, moduleName);
					self._eventBus.emit('moduleLoaded', moduleName);
					return self._loadPlaceholders(
						modules[moduleName],
						found[moduleName].placeholders
					);
				}));
		})
		.then(function () {
			self._loadedModules = modules;
			self._placeholdersByIds = null;
			self._eventBus.emit('allModulesLoaded');
			return modules;
		});
};

/**
 * Gets all modules in current modules folder.
 * @returns {Object} Set of loaded modules.
 */
ModuleLoader.prototype.getModulesByNames = function () {
	return this._loadedModules;
};

/**
 * Gets module object from found paths.
 * @param {Object} found Found paths description.
 * @param {string} moduleName Module name to load from found paths.
 * @returns {Object} Module object.
 * @private
 */
ModuleLoader.prototype._getModule = function (found, moduleName) {
	var moduleConstructor, moduleImplementation;
	if (typeof(found[moduleName].indexPath) === 'string') {
		found[moduleName].indexPath = path.resolve(
			// for windows
			found[moduleName].indexPath.replace(/(\\\\)|(\/)/g, path.sep)
		);
		// trying to load module constructor or use Object as a default
		try {
			moduleConstructor = require(found[moduleName].indexPath);
			if (typeof(moduleConstructor) !== 'function') {
				moduleConstructor = Object;
			}
		} catch (e) {
			moduleConstructor = Object;
			this._eventBus.emit('error', e);
		}

		var context = Object.create(
			this._serviceLocator.resolve('moduleApiProvider')
		);
		context.name = moduleName;
		context.state = {};
		context.renderedData = {};
		context.cookies = this._serviceLocator.resolve('cookiesWrapper');

		moduleConstructor.prototype.$context = context;
		moduleImplementation = this._serviceLocator.resolveInstance(
			moduleConstructor,
			this._config
		);
		if (!moduleImplementation.$context) {
			moduleImplementation.$context = context;
		}
	} else {
		this._logger.warn(util.format(WARN_MODULE_INDEX_NOT_FOUND, moduleName));
	}

	return {
		name: moduleName,
		implementation: moduleImplementation,
		placeholders: {}
	};
};

/**
 * Loads placeholders from found paths.
 * @param {Object} module Loaded module Object.
 * @param {Object} placeholders Found placeholders paths.
 * @returns {Promise} Promise for nothing.
 * @private
 */
ModuleLoader.prototype._loadPlaceholders = function (module, placeholders) {
	var self = this;

	return Promise.all(Object
		.keys(placeholders)
		.map(function (placeholderName) {
			return fs.readFile(
				placeholders[placeholderName],
				{encoding: 'utf8'}
			)
				.then(function (source) {
					var fullName = moduleHelper.joinModuleNameAndContext(
						module.name,
						placeholderName
					);

					self._templateProvider.registerSource(fullName, source);
					self._eventBus.emit('placeholderLoaded', {
						name: placeholderName,
						moduleName: module.name
					});

					var placeholder = {
						moduleName: module.name,
						name: placeholderName,
						fullName: fullName,
						getTemplateStream: function (data) {
							return self._templateProvider.getStream(
								fullName, data
							);
						}
					};
					if (moduleHelper.isRootPlaceholder(placeholderName)) {
						module.rootPlaceholder = placeholder;
						module.rootPlaceholder.name = placeholderName;
						return;
					}

					if (moduleHelper.isErrorPlaceholder(placeholderName)) {
						module.errorPlaceholder = placeholder;
						module.errorPlaceholder.name = placeholderName;
						return;
					}

					module.placeholders[placeholderName] = placeholder;
				});
		}));
};