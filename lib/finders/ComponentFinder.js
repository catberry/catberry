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
	moduleHelper = require('../helpers/moduleHelper'),
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
	WARN_TEMPLATE_REQUIRED = '"template" is a required field ' +
		'for component "%s" at %s. Skipping...',
	WARN_WRONG_COMPONENT_NAME =
		'Component name "%s" is incorrect (%s), skipping',
	WARN_SAME_COMPONENT_NAME =
		'Component %s has the same name as %s (%s), skipping';

util.inherits(ComponentFinder, events.EventEmitter);

/**
 * Creates new instance of the component finder.
 * @param {Logger} $logger Logger to log warnings.
 * @param {EventEmitter} $eventBus Event bus to exchange events.
 * @param {string?} componentsGlob Glob expression for searching components.
 * @constructor
 */
function ComponentFinder($logger, $eventBus, componentsGlob) {
	events.EventEmitter.call(this);
	this._logger = $logger;
	this._eventBus = $eventBus;
	if (typeof (componentsGlob) === 'string') {
		this._componentsGlob = [componentsGlob];
	} else if (util.isArray(componentsGlob)) {
		var areStrings = componentsGlob.every(function (expression) {
			return typeof (expression) === 'string';
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
 * Current set of last found components.
 * @type {Object}
 * @private
 */
ComponentFinder.prototype._foundComponentsByDirs = null;

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

	this._foundComponents = Object.create(null);
	this._foundComponentsByDirs = Object.create(null);

	var self = this,
		cache = {},
		symlinks = {},
		statCache = {};

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

					self._addComponent(componentDescriptor);
					self._eventBus.emit('componentFound', componentDescriptor);
				})
				.on('error', function (error) {
					reject(error);
				})
				.on('end', function () {
					fulfill();
				});
		});
	});

	return Promise.all(promises)
		.then(function () {
			return self._foundComponents;
		});
};

/**
 * Creates found component descriptor.
 * @param {string} filename Component filename.
 * @returns {{name: string, path: string, properties: Object}?} Found
 * component descriptor.
 * @private
 */
ComponentFinder.prototype._createComponentDescriptor = function (filename) {
	if (!filename) {
		return null;
	}

	var absolutePath = requireHelper.getAbsoluteRequirePath(filename);
	requireHelper.clearCacheKey(absolutePath);

	var properties;
	try {
		properties = require(absolutePath);
	} catch (e) {
		this._eventBus.emit('error', e);
	}

	if (!properties) {
		return null;
	}

	var componentName = (properties.name ||
		path.basename(path.dirname(filename))).toLowerCase();

	if (!COMPONENT_NAME_REGEXP.test(componentName)) {
		this._logger.warn(util.format(
			WARN_WRONG_COMPONENT_NAME, componentName,
			COMPONENT_NAME_REGEXP.toString()
		));
		return null;
	}

	if (typeof (properties.logic) !== 'string') {
		properties.logic = moduleHelper.DEFAULT_LOGIC_FILENAME;
	}

	if (typeof (properties.template) !== 'string') {
		this._logger.warn(util.format(
			WARN_TEMPLATE_REQUIRED, properties.name, properties.path
		));
		return null;
	}

	return {
		name: componentName,
		properties: properties,
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

	var self = this;

	this._fileWatcher = chokidar.watch(
		Object.keys(this._foundComponentsByDirs), CHOKIDAR_OPTIONS
	)
		.on('error', function (error) {
			self._eventBus.emit('error', error);
		})
		// component's directory is changed
		.on('change', function (filename) {
			var component = self._recognizeComponent(filename);
			if (!component || component.path === filename) {
				return;
			}

			var changeArgs = {
				filename: filename,
				component: component
			};

			// logic file is changed
			var relativeLogic = getRelativeForComponent(
				component.path, component.properties.logic
			);
			if (filename === relativeLogic) {
				self.emit('changeLogic', component);
				self.emit('change', changeArgs);
				return;
			}

			// template files are changed
			var relativeTemplate = getRelativeForComponent(
					component.path, component.properties.template
				),
				relativeErrorTemplate =
					typeof (component.properties.errorTemplate) === 'string' ?
						getRelativeForComponent(
							component.path, component.properties.errorTemplate
						) : null;

			if (filename === relativeTemplate ||
				filename === relativeErrorTemplate) {
				self.emit('changeTemplates', component);
				self.emit('change', changeArgs);
				return;
			}

			self.emit('change', changeArgs);
		})
		.on('unlink', function (filename) {
			var component = self._recognizeComponent(filename);
			if (!component || component.path === filename) {
				return;
			}
			self.emit('change', {
				filename: filename,
				component: component
			});
		})
		.on('add', function (filename) {
			var component = self._recognizeComponent(filename);
			if (!component || component.path === filename) {
				return;
			}
			self.emit('change', {
				filename: filename,
				component: component
			});
		});

	// watch cat-component.json files
	chokidar.watch(
		this._componentsGlob, CHOKIDAR_OPTIONS
	)
		.on('error', function (error) {
			self._eventBus.emit('error', error);
		})
		// add new component
		.on('add', function (filename) {
			var newComponent = self._createComponentDescriptor(
				filename
			);
			self._addComponent(newComponent);
			self.emit('add', newComponent);
		})
		// change cat-component.json of the found component
		.on('change', function (filename) {
			var component = self._recognizeComponent(filename);
			if (!component) {
				return;
			}
			var newComponent = self._createComponentDescriptor(
				component.path
			);

			// because component name could be changed
			self._removeComponent(component);
			self.emit('unlink', component);

			self._addComponent(newComponent);
			self.emit('add', newComponent);
		})
		// unlink found component
		.on('unlink', function (filename) {
			var component = self._recognizeComponent(filename);
			if (!component) {
				return;
			}
			self._removeComponent(component);
			self.emit('unlink', component);
		});
};

/**
 * Recognizes path to cat-component file by path to a file of the component.
 * @param {string} filename Filename of internal file of the component.
 * @returns {string} Path ot cat-component.json.
 * @private
 */
ComponentFinder.prototype._recognizeComponent = function (filename) {
	var current = filename,
		component = null;

	while (current !== '.') {
		if (current in this._foundComponentsByDirs) {
			component = this._foundComponentsByDirs[current];
			break;
		}
		current = path.dirname(current);
	}
	return component;
};

/**
 * Removes found component.
 * @param {Object} component Component descriptor to remove.
 * @private
 */
ComponentFinder.prototype._removeComponent = function (component) {
	var dirName = path.dirname(component.path),
		absolutePath = requireHelper.getAbsoluteRequirePath(component.path);

	requireHelper.clearCacheKey(absolutePath);

	delete this._foundComponents[component.name];
	delete this._foundComponentsByDirs[dirName];

	if (this._fileWatcher) {
		this._fileWatcher.unwatch(dirName);
	}
};

/**
 * Adds found component.
 * @param {Object} component Component descriptor.
 * @private
 */
ComponentFinder.prototype._addComponent = function (component) {
	if (!component) {
		return;
	}

	if (this._foundComponents[component.name]) {
		this._logger.warn(util.format(
			WARN_SAME_COMPONENT_NAME, component.path,
			this._foundComponents[component.name].path, component.name
		));
		return;
	}
	var dirName = path.dirname(component.path);
	this._foundComponents[component.name] = component;
	this._foundComponentsByDirs[dirName] = component;

	if (this._fileWatcher) {
		this._fileWatcher.add(dirName);
	}
};

/**
 * Gets component inner path which is relative to CWD.
 * @param {string} componentPath Path to a component.
 * @param {string} innerPath The path inside the component.
 * @returns {string} The path which is relative to CWD.
 */
function getRelativeForComponent(componentPath, innerPath) {
	return path.relative(
		process.cwd(), path.normalize(
			path.join(path.dirname(componentPath), innerPath)
		)
	);
}