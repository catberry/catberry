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

const path = require('path');
const requireHelper = require('../helpers/requireHelper');
const moduleHelper = require('../helpers/moduleHelper');
const chokidar = require('chokidar');
const util = require('util');
const events = require('events');
const glob = require('glob');

const CHOKIDAR_OPTIONS = {
	ignoreInitial: true,
	cwd: process.cwd(),
	ignorePermissionErrors: true
};

const COMPONENTS_DEFAULT_GLOB = [
	'catberry_components/**/cat-component.json',
	'node_modules/*/cat-component.json'
];
const COMPONENT_NAME_REGEXP = /^[\w-]+$/i;

class ComponentFinder extends events.EventEmitter {

	/**
	 * Creates new instance of the component finder.
	 * @param {Logger} $logger Logger to log warnings.
	 * @param {EventEmitter} $eventBus Event bus to exchange events.
	 * @param {string?} componentsGlob Glob expression for searching components.
	 */
	constructor($logger, $eventBus, componentsGlob) {
		super();

		/**
		 * Current logger.
		 * @type {Logger}
		 * @private
		 */
		this._logger = $logger;

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = $eventBus;

		/**
		 * Current file watcher.
		 * @type {FileWatcher}
		 * @private
		 */
		this._fileWatcher = null;

		/**
		 * Current set of last found components.
		 * @type {Object}
		 * @private
		 */
		this._foundComponents = null;

		/**
		 * Current Map of last found components.
		 * @type {Object}
		 * @private
		 */
		this._foundComponentsByDirs = null;

		/**
		 * Current components glob.
		 * @type {string}
		 * @private
		 */
		this._componentsGlob = COMPONENTS_DEFAULT_GLOB;

		if (typeof (componentsGlob) === 'string') {
			this._componentsGlob = [componentsGlob];
		} else if (util.isArray(componentsGlob)) {
			const areStrings = componentsGlob
				.every((expression) => typeof (expression) === 'string');

			if (areStrings) {
				this._componentsGlob = componentsGlob;
			}
		}
	}

	/**
	 * Finds all paths to components.
	 * @returns {Promise<Object>} Promise for set of found components by names.
	 */
	find() {
		if (this._foundComponents) {
			return Promise.resolve(this._foundComponents);
		}

		this._foundComponents = Object.create(null);
		this._foundComponentsByDirs = Object.create(null);

		const cache = {};
		const symlinks = {};
		const statCache = {};

		const promises = this._componentsGlob
			.map((expression) => new Promise((fulfill, reject) => {
				const componentFilesGlob = new glob.Glob(
					expression, {
						nosort: true,
						silent: true,
						nodir: true,
						cache,
						statCache,
						symlinks
					}
				);

				componentFilesGlob
					.on('match', (match) => {
						const componentDescriptor =
							this._createComponentDescriptor(match);

						this._addComponent(componentDescriptor);
						this._eventBus.emit(
							'componentFound', componentDescriptor
						);
					})
					.on('error', (error) => reject(error))
					.on('end', fulfill);
			}));

		return Promise
			.all(promises)
			.then(() => this._foundComponents);
	}

	/**
	 * Watches components for changing.
	 * @returns {undefined}.
	 */
	watch() {
		if (this._fileWatcher) {
			return;
		}

		this._fileWatcher = chokidar.watch(
			Object.keys(this._foundComponentsByDirs), CHOKIDAR_OPTIONS
		)
			.on('error', (error) => this._eventBus.emit('error', error))
			// component's directory is changed
			.on('change', (filename) => {
				const component = this._recognizeComponent(filename);
				if (!component || component.path === filename) {
					return;
				}

				const changeArgs = {
					filename,
					component
				};

				// logic file is changed
				const relativeLogic = this._getRelativeForComponent(
					component.path, component.properties.logic
				);
				if (filename === relativeLogic) {
					this.emit('changeLogic', component);
					this.emit('change', changeArgs);
					return;
				}

				// template files are changed
				const relativeTemplate = this._getRelativeForComponent(
					component.path, component.properties.template
				);
				const relativeErrorTemplate =
					typeof (component.properties.errorTemplate) === 'string' ?
						this._getRelativeForComponent(
							component.path, component.properties.errorTemplate
						) : null;

				if (filename === relativeTemplate ||
					filename === relativeErrorTemplate) {
					this.emit('changeTemplates', component);
					this.emit('change', changeArgs);
					return;
				}

				this.emit('change', changeArgs);
			})
			.on('unlink', (filename) => {
				const component = this._recognizeComponent(filename);
				if (!component || component.path === filename) {
					return;
				}
				this.emit('change', {filename, component});
			})
			.on('add', (filename) => {
				const component = this._recognizeComponent(filename);
				if (!component || component.path === filename) {
					return;
				}
				this.emit('change', {filename, component});
			});

		// watch cat-component.json files
		chokidar.watch(
			this._componentsGlob, CHOKIDAR_OPTIONS
		)
			.on('error', (error) => this._eventBus.emit('error', error))
			// add new component
			.on('add', (filename) => {
				const newComponent =
					this._createComponentDescriptor(filename);
				this._addComponent(newComponent);
				this.emit('add', newComponent);
			})
			// change cat-component.json of the found component
			.on('change', (filename) => {
				const component = this._recognizeComponent(filename);
				if (!component) {
					return;
				}
				const newComponent = this._createComponentDescriptor(
					component.path
				);

				// because component name could be changed
				this._removeComponent(component);
				this.emit('unlink', component);

				this._addComponent(newComponent);
				this.emit('add', newComponent);
			})
			// unlink found component
			.on('unlink', (filename) => {
				const component = this._recognizeComponent(filename);
				if (!component) {
					return;
				}
				this._removeComponent(component);
				this.emit('unlink', component);
			});
	}

	/**
	 * Creates found component descriptor.
	 * @param {string} filename Component filename.
	 * @returns {{name: string, path: string, properties: Object}?} Found
	 * component descriptor.
	 * @private
	 */
	_createComponentDescriptor(filename) {
		if (!filename) {
			return null;
		}

		const absolutePath = requireHelper.getAbsoluteRequirePath(filename);
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

		const componentName = (properties.name ||
			path.basename(path.dirname(filename))).toLowerCase();

		if (!COMPONENT_NAME_REGEXP.test(componentName)) {
			this._logger.warn(
				`Component name "${componentName}" is incorrect (${COMPONENT_NAME_REGEXP.toString()}), skipping...`
			);
			return null;
		}

		if (typeof (properties.logic) !== 'string') {
			properties.logic = moduleHelper.DEFAULT_LOGIC_FILENAME;
		}

		if (typeof (properties.template) !== 'string') {
			this._logger.warn(
				`"template" is a required field for component "${properties.name}" at ${properties.path}, skipping...`
			);
			return null;
		}

		return {
			name: componentName,
			properties,
			path: path.relative(process.cwd(), filename)
		};
	}

	/**
	 * Recognizes path to cat-component file by path to a file of the component.
	 * @param {string} filename Filename of internal file of the component.
	 * @returns {string} Path ot cat-component.json.
	 * @private
	 */
	_recognizeComponent(filename) {
		var current = filename;
		var component = null;

		while (current !== '.') {
			if (current in this._foundComponentsByDirs) {
				component = this._foundComponentsByDirs[current];
				break;
			}
			current = path.dirname(current);
		}
		return component;
	}

	/**
	 * Removes found component.
	 * @param {Object} component Component descriptor to remove.
	 * @private
	 */
	_removeComponent(component) {
		const dirName = path.dirname(component.path);
		const absolutePath = requireHelper.getAbsoluteRequirePath(component.path);

		requireHelper.clearCacheKey(absolutePath);

		delete this._foundComponents[component.name];
		delete this._foundComponentsByDirs[dirName];

		if (this._fileWatcher) {
			this._fileWatcher.unwatch(dirName);
		}
	}

	/**
	 * Adds found component.
	 * @param {Object} component Component descriptor.
	 * @private
	 */
	_addComponent(component) {
		if (!component) {
			return;
		}

		if (this._foundComponents[component.name]) {
			this._logger.warn(
				`Component ${component.path} has the same name as ${this._foundComponents[component.name].path} (${component.name}), skipping...`
			);
			return;
		}
		const dirName = path.dirname(component.path);
		this._foundComponents[component.name] = component;
		this._foundComponentsByDirs[dirName] = component;

		if (this._fileWatcher) {
			this._fileWatcher.add(dirName);
		}
	}

	/**
	 * Gets component inner path which is relative to CWD.
	 * @param {string} componentPath Path to a component.
	 * @param {string} innerPath The path inside the component.
	 * @returns {string} The path which is relative to CWD.
	 */
	_getRelativeForComponent(componentPath, innerPath) {
		return path.relative(
			process.cwd(), path.normalize(
				path.join(path.dirname(componentPath), innerPath)
			)
		);
	}
}

module.exports = ComponentFinder;
