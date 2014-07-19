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

module.exports = ModuleFinder;

var path = require('path'),
	util = require('util'),
	glob = require('glob'),
	watch = require('glob-watcher');

var PLACEHOLDERS_SUBFOLDER_NAME = 'placeholders',
	MODULE_MAIN_FILENAME = 'index.js',
	MODULE_NAME_REGEXP = /^[a-z]+[a-z0-9-]*$/i,
	PLACEHOLDER_NAME_REGEXP = /^[\w-]+$/i,
	DEFAULT_MODULES_ROOT = path.join(process.cwd(), 'catberry_modules'),
	WARN_WRONG_MODULE_NAME = 'Module name "%s" is incorrect (%s), skipping',
	WARN_WRONG_PLACEHOLDER_NAME =
		'Placeholder name "%s" is incorrect (%s), skipping';

var GLOB_OPTIONS = {
	nosort: true,
	silent: true,
	nocase: true
};

/**
 * Creates new instance of module finder.
 * @param {Logger} $logger Logger to log messages.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @param {string} modulesFolder Folder with catberry modules.
 * @constructor
 */
function ModuleFinder($logger, $eventBus, modulesFolder) {
	this._logger = $logger;
	this._eventBus = $eventBus;
	var currentModulesFolder = modulesFolder || DEFAULT_MODULES_ROOT;
	currentModulesFolder = path.resolve(currentModulesFolder);
	this._modulesFolder = currentModulesFolder;
	this._indexFileGlobExpression = path.join(
		this._modulesFolder, '*', MODULE_MAIN_FILENAME);
	this._placeholdersGlobExpression = path.join(
		this._modulesFolder, '*', PLACEHOLDERS_SUBFOLDER_NAME, '**', '*.dust');
	this._sourceGlobExpression = path.join(
		this._modulesFolder, '**', '*.js');
}

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ModuleFinder.prototype._logger = null;

/**
 * Current folder with catberry modules.
 * @type {string}
 */
ModuleFinder.prototype._modulesFolder = DEFAULT_MODULES_ROOT;

/**
 * Current glob to module index files.
 * @type {string}
 */
ModuleFinder.prototype._indexFileGlobExpression = '';

/**
 * Current glob to module source files.
 * @type {string}
 */
ModuleFinder.prototype._sourceGlobExpression = '';

/**
 * Current glob to module placeholders.
 * @type {string}
 */
ModuleFinder.prototype._placeholdersGlobExpression = '';

/**
 * Finds all modules and its placeholders and returns object with results via
 * callback. Result is an object with module names and path to index.js
 * and objects with placeholder names and paths.
 * @param {Function} callback Callback on finish.
 */
ModuleFinder.prototype.find = function (callback) {
	var self = this;
	this._getModulesPaths(function (result) {
		self._getPlaceholderPaths(callback, result);
	});
};

/**
 * Watches on resources which can be reloaded in runtime.
 * @param {Function} callback Callback with all paths on finish.
 */
ModuleFinder.prototype.watch = function (callback) {
	watch([this._placeholdersGlobExpression, this._sourceGlobExpression],
		GLOB_OPTIONS,
		function () {
			callback();
		});
};

/**
 * Gets object with found modules paths to index files.
 * @param {Function} callback Callback on finish.
 * @private
 */
ModuleFinder.prototype._getModulesPaths = function (callback) {
	var self = this,
		result = {},
		indexFilesGlob = new glob.Glob(
			this._indexFileGlobExpression, GLOB_OPTIONS);

	indexFilesGlob.on('match', function (match) {
		var moduleName = path.basename(path.dirname(match));
		if (!MODULE_NAME_REGEXP.test(moduleName)) {
			self._logger.warn(util.format(WARN_WRONG_MODULE_NAME,
				moduleName,
				MODULE_NAME_REGEXP.toString()));
			return;
		}
		result[moduleName] = {
			indexPath: match,
			placeholders: {}
		};
		self._eventBus.emit('moduleFound', {
			name: moduleName,
			path: match
		});
	});

	indexFilesGlob.on('error', function (error) {
		self._eventBus.emit('error', error);
		callback({});
	});
	indexFilesGlob.on('end', function () {
		callback(result);
	});
};

/**
 * Gets or fills object with placeholders paths for every module.
 * @param {Function} callback Callback on finish.
 * @param {Object?} result Result object to fill.
 * @private
 */
ModuleFinder.prototype._getPlaceholderPaths = function (callback, result) {
	result = result || {};

	var self = this,
		placeholdersGlob = new glob.Glob(
			this._placeholdersGlobExpression, GLOB_OPTIONS);

	placeholdersGlob.on('match', function (match) {
		var basename = path.basename(match, '.dust');
		if (!PLACEHOLDER_NAME_REGEXP.test(basename)) {
			self._logger.warn(util.format(WARN_WRONG_PLACEHOLDER_NAME,
				basename,
				PLACEHOLDER_NAME_REGEXP.toString()));
			return;
		}

		var moduleName, dirName = match;
		do {
			moduleName = path.basename(dirName);
			dirName = path.dirname(dirName);
		} while (dirName != self._modulesFolder || !moduleName);

		if (!MODULE_NAME_REGEXP.test(moduleName)) {
			return;
		}

		if (!(moduleName in result)) {
			result[moduleName] = {
				placeholders: {}
			};
		}

		if (!result[moduleName].placeholders) {
			result[moduleName].placeholders = {};
		}

		result[moduleName].placeholders[basename] = match;
		self._eventBus.emit('placeholderFound', {
			name: basename,
			moduleName: moduleName,
			path: match
		});
	});

	placeholdersGlob.on('error', function (error) {
		self._eventBus.emit('error', error);
		callback({});
	});
	placeholdersGlob.on('end', function () {
		callback(result);
	});
};