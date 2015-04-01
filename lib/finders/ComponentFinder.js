/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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

module.exports = ComponentFinder;

var path = require('path'),
	requireHelper = require('../helpers/requireHelper'),
	util = require('util'),
	glob = require('glob');

var COMPONENTS_DEFAULT_GLOB = '**/cat-component.json',
	COMPONENT_NAME_REGEXP = /^[\w-]+$/i,
	WARN_WRONG_COMPONENT_NAME =
		'Component name "%s" is incorrect (%s), skipping',
	WARN_SAME_COMPONENT_NAME =
		'Component %s has the same name as %s (%s) , skipping';

/**
 * Creates new instance of the component finder.
 * @param {Logger} $logger Logger to log warnings.
 * @param {EventEmitter} $eventBus Event bus to exchange events.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {String?} componentsGlob Glob expression for searching components.
 * @constructor
 */
function ComponentFinder($logger, $eventBus, $serviceLocator, componentsGlob) {
	this._logger = $logger;
	this._eventBus = $eventBus;
	this._componentsGlob = componentsGlob || this._componentsGlob;
	this._serviceLocator = $serviceLocator;
}

/**
 * Current file watcher.
 * @type {FileWatcher}
 * @private
 */
ComponentFinder.prototype._fileWatcher = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ComponentFinder.prototype._logger = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
ComponentFinder.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
ComponentFinder.prototype._serviceLocator = null;

/**
 * Current set of last found components.
 * @type {Object}
 * @private
 */
ComponentFinder.prototype._lastFoundComponents = null;

/**
 * Current components glob.
 * @type {string}
 * @private
 */
ComponentFinder.prototype._componentsGlob = COMPONENTS_DEFAULT_GLOB;

/**
 * Finds all paths to components.
 * @returns {Promise<Object>} Promise for set of found components by names.
 */
ComponentFinder.prototype.find = function () {
	if (this._fileWatcher) {
		this._fileWatcher.unwatch();
	}

	var self = this;

	return new Promise(function (fulfill, reject) {
		var result = {},
			componentFilesGlob = new glob.Glob(self._componentsGlob);

		componentFilesGlob
			.on('match', function (match) {
				var component = require(process.cwd() + '/' + match),
					componentName = component.name ||
						path.basename(path.dirname(match));

				componentName = componentName.toLowerCase();

				if (!COMPONENT_NAME_REGEXP.test(componentName)) {
					self._logger.warn(util.format(
						WARN_WRONG_COMPONENT_NAME, componentName,
						COMPONENT_NAME_REGEXP.toString()
					));
					return;
				}

				if (result[componentName]) {
					self._logger.warn(util.format(
						WARN_SAME_COMPONENT_NAME, match,
						result[componentName].path, componentName
					));
					return;
				}

				result[componentName] = {
					name: componentName,
					properties: component,
					path: path.relative(process.cwd(), match)
				};
				self._eventBus.emit('componentFound', result[componentName]);
			})
			.on('error', function (error) {
				reject(error);
			})
			.on('end', function () {
				fulfill(result);
			});
	})
		.then(function (result) {
			self._lastFoundComponents = result;
			self._fileWatcher = self._serviceLocator.resolve('fileWatcher');
			return result;
		});
};

/**
 * Watches components for changing.
 * @param {Function} handler Change handler.
 */
ComponentFinder.prototype.watch = function (handler) {
	if (!this._fileWatcher) {
		return;
	}

	var globs = [],
		self = this;

	// adding templates and logic files of components
	Object.keys(this._lastFoundComponents)
		.forEach(function (name) {
			var componentDirectory = path.dirname(
				self._lastFoundComponents[name].path
			);
			globs.push(
				componentDirectory + '/**/*'
			);
		});

	this._fileWatcher.watch(globs, handler);
};