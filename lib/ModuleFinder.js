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
	PLACEHOLDER_BASENAME_REGEXP = /^(.+)\.\w+$/,
	DEFAULT_MODULES_ROOT = 'catberry_modules',
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
	this._modulesFolder = modulesFolder || DEFAULT_MODULES_ROOT;
	this._indexFileGlobExpression = this._modulesFolder + '/*/' +
		MODULE_MAIN_FILENAME;
	this._placeholdersGlobExpression = this._modulesFolder + '/*/' +
		PLACEHOLDERS_SUBFOLDER_NAME + '/**/*.*';
	this._sourceGlobExpression = this._modulesFolder + '/**/*.js';
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
 * Current glob for module index files.
 * @type {string}
 */
ModuleFinder.prototype._indexFileGlobExpression = '';

/**
 * Current glob for module source files.
 * @type {string}
 */
ModuleFinder.prototype._sourceGlobExpression = '';

/**
 * Current glob for module placeholders.
 * @type {string}
 */
ModuleFinder.prototype._placeholdersGlobExpression = '';

/**
 * Finds all modules and its placeholders.
 * Result is an object with module names and path to index.js
 * and objects with placeholder names and paths.
 * @returns {Promise<Object>} Promise for found paths.
 */
ModuleFinder.prototype.find = function () {
	var self = this;
	return this._getModulesPaths()
		.then(this._getPlaceholderPaths.bind(this), function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Watches on resources which can be reloaded in runtime.
 * @param {Function} handler Handler of all changes.
 */
ModuleFinder.prototype.watch = function (handler) {
	watch(
		[this._placeholdersGlobExpression, this._sourceGlobExpression],
		GLOB_OPTIONS, handler
	);
};

/**
 * Gets object with found modules paths to index files.
 * @returns {Promise<Object>} Promise for module paths.
 * @private
 */
ModuleFinder.prototype._getModulesPaths = function () {
	var self = this;

	return new Promise(function (fulfill, reject) {
		var result = {},
			indexFilesGlob = new glob.Glob(
				self._indexFileGlobExpression,
				GLOB_OPTIONS
			);

		indexFilesGlob
			.on('match', function (match) {
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
			})
			.on('error', function (error) {
				reject(error);
			})
			.on('end', function () {
				fulfill(result);
			});
	});
};

/**
 * Gets or fills object with placeholders paths for every module.
 * @param {Object?} result Result object to fill.
 * @returns {Promise<Object>} Promise for placeholder paths.
 * @private
 */
ModuleFinder.prototype._getPlaceholderPaths = function (result) {
	result = result || {};
	var self = this;

	return new Promise(function (fulfill, reject) {
		var placeholdersGlob = new glob.Glob(
			self._placeholdersGlobExpression, GLOB_OPTIONS
		);

		placeholdersGlob
			.on('match', function (match) {
				var basename = path.basename(match),
					placeholderName = PLACEHOLDER_BASENAME_REGEXP
						.exec(basename)[1];
				if (!placeholderName ||
					!PLACEHOLDER_NAME_REGEXP.test(placeholderName)) {
					self._logger.warn(util.format(
						WARN_WRONG_PLACEHOLDER_NAME,
						placeholderName,
						PLACEHOLDER_NAME_REGEXP.toString()
					));
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

				result[moduleName].placeholders[placeholderName] = match;
				self._eventBus.emit('placeholderFound', {
					name: placeholderName,
					moduleName: moduleName,
					path: match
				});
			})
			.on('error', function (error) {
				reject(error);
			})
			.on('end', function () {
				fulfill(result);
			});
	});
};