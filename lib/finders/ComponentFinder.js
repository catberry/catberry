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
	chokidar = require('chokidar'),
	util = require('util'),
	events = require('events'),
	glob = require('glob');

var CHOKIDAR_OPTIONS = {
	ignoreInitial: true,
	cwd: process.cwd(),
	ignorePermissionErrors: true
};

var COMPONENTS_DEFAULT_GLOB = [
		'catberry_components/**/cat-component.json',
		'node_modules/*/cat-component.json'
	],
	COMPONENT_NAME_REGEXP = /^[\w-]+$/i,
	WARN_WRONG_COMPONENT_NAME =
		'Component name "%s" is incorrect (%s), skipping',
	WARN_SAME_COMPONENT_NAME =
		'Component %s has the same name as %s (%s) , skipping';

util.inherits(ComponentFinder, events.EventEmitter);

/**
 * Creates new instance of the component finder.
 * @param {Logger} $logger Logger to log warnings.
 * @param {EventEmitter} $eventBus Event bus to exchange events.
 * @param {String?} componentsGlob Glob expression for searching components.
 * @constructor
 */
function ComponentFinder($logger, $eventBus, componentsGlob) {
	events.EventEmitter.call(this);
	this._logger = $logger;
	this._eventBus = $eventBus;
	if (typeof(componentsGlob) === 'string') {
		this._componentsGlob = [componentsGlob];
	} else if (util.isArray(componentsGlob)) {
		var areStrings = componentsGlob.every(function (expression) {
			return typeof(expression) === 'string';
		});
		if (areStrings) {
			this._componentsGlob = componentsGlob;
		}
	}
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
 * Current set of last found components.
 * @type {Object}
 * @private
 */
ComponentFinder.prototype._foundComponents = null;

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
	if (this._foundComponents) {
		return Promise.resolve(this._foundComponents);
	}

	var self = this,
		cache = {},
		symlinks = {},
		statCache = {},
		result = {};

	// TODO organize by path to cat-component.json or to directory
	var promises = this._componentsGlob.map(function (expression) {
		return new Promise(function (fulfill, reject) {
			var componentFilesGlob = new glob.Glob(
				expression, {
					nosort: true,
					silent: true,
					nodir: true,
					cache: cache,
					statCache: statCache,
					symlinks: symlinks
				}
			);

			componentFilesGlob
				.on('match', function (match) {
					var componentDescriptor = self._createComponentDescriptor(
						match
					);

					if (!componentDescriptor) {
						return;
					}

					if (result[componentDescriptor.name]) {
						self._logger.warn(util.format(
							WARN_SAME_COMPONENT_NAME, match,
							componentDescriptor.path, componentDescriptor.name
						));
						return;
					}

					result[componentDescriptor.name] = componentDescriptor;
					self._eventBus.emit('componentFound', componentDescriptor);
				})
				.on('error', function (error) {
					reject(error);
				})
				.on('end', function () {
					fulfill(result);
				});
		});
	});

	return Promise.all(promises)
		.then(function () {
			self._foundComponents = result;
			return result;
		});
};

/**
 * Creates found component descriptor.
 * @param {string} filename Component filename.
 * @returns {{name: string, path: string, properties: Object}}
 * Found component descriptor.
 * @private
 */
ComponentFinder.prototype._createComponentDescriptor = function (filename) {
	if (!filename) {
		return null;
	}
	var component = require(process.cwd() + '/' + filename),
		componentName = component.name ||
			path.basename(path.dirname(filename));

	componentName = componentName.toLowerCase();

	if (!COMPONENT_NAME_REGEXP.test(componentName)) {
		this._logger.warn(util.format(
			WARN_WRONG_COMPONENT_NAME, componentName,
			COMPONENT_NAME_REGEXP.toString()
		));
		return null;
	}

	return {
		name: componentName,
		properties: component,
		path: path.relative(process.cwd(), filename)
	};
};

/**
 * Watches components for changing.
 */
ComponentFinder.prototype.watch = function () {
	if (this._fileWatcher) {
		return;
	}

	var globs = [],
		self = this;

	// adding templates and logic files of components
	Object.keys(this._foundComponents)
		.forEach(function (name) {
			var componentDirectory = path.dirname(
				self._foundComponents[name].path
			);
			globs.push(
				componentDirectory + '/**/*'
			);
		});

	// TODO implement this method.

	this._fileWatcher = chokidar.watch(
		globs, CHOKIDAR_OPTIONS
	)
		.on('error', function (error) {
			self._eventBus.emit('error', error);
		})
		.on('add', function (filename) {
			var componentPath = self._recognizeComponent(filename),
				component = self._createComponentDescriptor(componentPath);
			if (!component) {
				return;
			}

			if (component.name) {
				self._logger.warn(util.format(
					WARN_SAME_COMPONENT_NAME, filename,
					component.path, component.name
				));
				return;
			}
			self._foundComponents[component.name] = component;
			self.emit('add', component);
		})
		.on('change', function (filename) {
			var componentPath = self._recognizeComponent(filename),
				component = self._createComponentDescriptor(componentPath);
			if (!component) {
				return;
			}
			self._foundComponents[component.name] = component;
			self.emit('change', component);
		})
		.on('unlink', function (filename) {
			var componentPath = self._recognizeComponent(filename),
				// TODO we can not to that because of "require"
				component = self._createComponentDescriptor(componentPath);

			if (!component) {
				return;
			}
			delete self._foundComponents[component.name];
			self.emit('unlink', component);
		});
};

/**
 * Recognizes path to cat-component.json by path to a file of the component.
 * @param {string} filename Filename of internal file of the component.
 * @returns {string} Path ot cat-component.json.
 * @private
 */
ComponentFinder.prototype._recognizeComponent = function (filename) {
	// TODO should return cat-component.json path
	return filename;
};