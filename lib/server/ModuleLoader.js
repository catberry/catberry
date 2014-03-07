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
	path = require('path');

var PLACEHOLDERS_SUBFOLDER_NAME = 'placeholders',
	ASSETS_SUBFOLDER_NAME = 'assets',
	MAIN_FILENAME = 'index.js',
	MODULE_NAME_REGEXP = /^\w+$/i,
	PLACEHOLDER_NAME_REGEXP = /^[\w-]+\.[a-z]+$/i,
	ROOT_PLACEHOLDER_NAME = '__index',
	DEFAULT_MODULES_FOLDER = './catberry_modules',
	ERROR_MODULE_SHOULD_HAVE_RENDER = 'Module "%s" should have render method',
	ERROR_MODULE_SHOULD_HAVE_HANDLE = 'Module "%s" should have handle method',
	ERROR_MODULE_SHOULD_HAVE_SUBMIT = 'Module "%s" should have submit method',
	ERROR_MODULE_SHOULD_EXPORT_CONSTRUCTOR = 'Module should export constructor',
	WARN_WRONG_MODULE_NAME = 'Module name "%s" is incorrect (%s), skipped',
	WARN_WRONG_PLACEHOLDER_NAME = 'Placeholder name "%s" is incorrect (%s), skipped',
	TRACE_MODULE_LOADED = 'Module "%s" loaded',
	TRACE_PLACEHOLDER_LOADED = 'Placeholder "%s" loaded';

/**
 * Creates new instance of module loader.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve module.
 * @param {TemplateProvider} $templateProvider Provider to compile templates.
 * @param {Logger} $logger Logger to log messages.
 * @param {Object} $config Current configuration object to pass to modules.
 * @param {string} modulesFolder Folder path where to search for modules.
 * @constructor
 */
function ModuleLoader($serviceLocator, $templateProvider, $logger, $config,
	modulesFolder) {

	this._logger = $logger;
	this._config = $config;
	this._serviceLocator = $serviceLocator;
	this._templateProvider = $templateProvider;

	var currentModulesFolder = modulesFolder || DEFAULT_MODULES_FOLDER;
	currentModulesFolder = path.resolve(currentModulesFolder);
	this._modulesFolder = currentModulesFolder;
}

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
 * Current modules folder.
 * @type {string}
 * @private
 */
ModuleLoader.prototype._modulesFolder = '';

/**
 * Loads modules from current folder.
 * @returns {Object}
 */
ModuleLoader.prototype.loadModules = function () {
	var context = this,
		result = {};

	fs.readdirSync(context._modulesFolder)
		.forEach(function (filename) {

			if (!MODULE_NAME_REGEXP.test(filename)) {
				context._logger.warn(util.format(WARN_WRONG_MODULE_NAME,
					filename, MODULE_NAME_REGEXP.toString()));
				return;
			}

			var fullPath = path.join(context._modulesFolder, filename);
			var stat = fs.statSync(fullPath);
			if (!stat.isDirectory()) {
				return;
			}

			var module = loadModule(fullPath, context);
			if (module === null) {
				return;
			}
			module.name = filename;
			result[filename] = module;
		});

	return result;
};

/**
 * Loads module from specified path.
 * @param {string} modulePath Path to module folder.
 * @param {ModuleLoader} context Context of execution.
 * @returns {Object}
 */
function loadModule(modulePath, context) {
	var indexFilePath = path.join(modulePath, MAIN_FILENAME);
	if (!fs.existsSync(indexFilePath)) {
		return null;
	}

	var moduleName = path.basename(modulePath),
		moduleConstructor = require(indexFilePath);
	checkModuleInterface(moduleConstructor);

	var moduleImplementation = context._serviceLocator.resolveInstance(
		moduleConstructor, context._config);

	var module = {
		name: moduleName,
		implementation: moduleImplementation,
		placeholders: {},
		assets: getAssetsPaths(modulePath)
	};

	getPlaceholderPaths(modulePath, context)
		.forEach(function (filename) {
			var extension = path.extname(filename),
				name = path.basename(filename, extension).toLowerCase(),
				template = context._templateProvider.load(filename);
			context._logger.trace(util.format(TRACE_PLACEHOLDER_LOADED,
				filename));

			var placeholder = {
				moduleName: moduleName,
				name: name,
				template: template
			};

			if (name === ROOT_PLACEHOLDER_NAME) {
				module.rootPlaceholder = placeholder;
				return;
			}

			module.placeholders[name] = placeholder;
		});

	context._logger.trace(util.format(TRACE_MODULE_LOADED, modulePath));

	return module;
}

/**
 * Gets all file paths in assets folder of module recursively.
 * @param {string} modulePath Path to module folder.
 * @returns {Array<string>}
 */
function getAssetsPaths(modulePath) {
	var assetsPath = path.join(modulePath, ASSETS_SUBFOLDER_NAME);

	if (!fs.existsSync(assetsPath)) {
		return [];
	}

	var stat = fs.statSync(assetsPath);
	if (!stat.isDirectory()) {
		return [];
	}

	return getFilePathsRecursively(assetsPath);
}

/**
 * Gets all file paths recursively for specified folder.
 * @param {string} folderPath Folder to traverse.
 * @param {Array?} resultArray Array where results will be placed.
 * @returns {Array}
 */
function getFilePathsRecursively(folderPath, resultArray) {
	var result = resultArray || [];

	fs.readdirSync(folderPath)
		.forEach(function (fileName) {
			var fullPath = path.join(folderPath, fileName),
				stat = fs.statSync(fullPath);

			if (stat.isDirectory()) {
				getFilePathsRecursively(fullPath, result);
				return;
			}

			result.push(fullPath);
		});
	return result;
}

/**
 * Gets all placeholder paths in module folder.
 * @param {string} modulePath Path to module folder.
 * @param {ModuleLoader} context Context of execution.
 * @returns {Array<string>}
 */
function getPlaceholderPaths(modulePath, context) {
	var placeholdersPath = path.join(modulePath, PLACEHOLDERS_SUBFOLDER_NAME),
		result = [];

	if (!fs.existsSync(placeholdersPath)) {
		return result;
	}

	var stat = fs.statSync(placeholdersPath);
	if (!stat.isDirectory()) {
		return result;
	}

	fs.readdirSync(placeholdersPath)
		.forEach(function (filename) {
			if (!PLACEHOLDER_NAME_REGEXP.test(filename)) {
				context._logger.warn(util.format(WARN_WRONG_PLACEHOLDER_NAME,
					filename, PLACEHOLDER_NAME_REGEXP.toString()));
				return;
			}

			var fullPath = path.join(placeholdersPath, filename),
				stat = fs.statSync(fullPath);

			if (!stat.isFile()) {
				return;
			}

			result.push(fullPath);
		});

	return result;
}

/**
 * Checks module constructor is it according to required interface.
 * @param {Function} moduleConstructor Module constructor.
 */
function checkModuleInterface(moduleConstructor) {
	if (!(moduleConstructor instanceof Function)) {
		throw new Error(ERROR_MODULE_SHOULD_EXPORT_CONSTRUCTOR);
	}

	if (!(moduleConstructor.prototype.render instanceof Function)) {
		throw new Error(util.format(ERROR_MODULE_SHOULD_HAVE_RENDER,
			moduleConstructor.name));
	}

	if (!(moduleConstructor.prototype.handle instanceof Function)) {
		throw new Error(util.format(ERROR_MODULE_SHOULD_HAVE_HANDLE,
			moduleConstructor.name));
	}

	if (!(moduleConstructor.prototype.submit instanceof Function)) {
		throw new Error(util.format(ERROR_MODULE_SHOULD_HAVE_SUBMIT,
			moduleConstructor.name));
	}
}
