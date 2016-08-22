'use strict';

const path = require('path');
const requireHelper = require('../helpers/requireHelper');
const moduleHelper = require('../helpers/moduleHelper');
const chokidar = require('chokidar');
const events = require('events');
const glob = require('glob');

const CHOKIDAR_OPTIONS = {
	ignoreInitial: true,
	useFsEvents: false,
	cwd: process.cwd(),
	ignorePermissionErrors: true
};

const COMPONENTS_DEFAULT_GLOB = [
	'catberry_components/**/cat-component.json',
	'node_modules/*/cat-component.json'
];
const COMPONENT_NAME_REGEXP = /^[\w-]+$/i;

/**
 * Implements the component finder module.
 */
class ComponentFinder extends events.EventEmitter {

	/**
	 * Creates a new instance of the component finder.
	 * @param {ServiceLocator} locator The Service Locator for resolving dependencies.
	 */
	constructor(locator) {
		super();

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current file watcher.
		 * @type {FileWatcher}
		 * @private
		 */
		this._fileWatcher = null;

		/**
		 * Current set of last found components by their names.
		 * @type {Map}
		 * @private
		 */
		this._foundComponentsByNames = null;

		/**
		 * Current Map of last found components by their directories.
		 * @type {Map}
		 * @private
		 */
		this._foundComponentsByDirs = null;

		/**
		 * Current Promise for the ready state.
		 * @type {Promise}
		 * @private
		 */
		this._readyPromise = null;

		/**
		 * Current components' glob.
		 * @type {string}
		 * @private
		 */
		this._componentsGlob = COMPONENTS_DEFAULT_GLOB;

		const componentsGlob = locator.resolve('config').componentsGlob;
		if (typeof (componentsGlob) === 'string') {
			this._componentsGlob = [componentsGlob];
		} else if (Array.isArray(componentsGlob)) {
			const areStrings = componentsGlob
				.every(expression => typeof (expression) === 'string');

			if (areStrings) {
				this._componentsGlob = componentsGlob;
			}
		}
	}

	/**
	 * Finds all the components.
	 * @returns {Promise<Map>} Promise for Map of found components by their names.
	 */
	find() {
		if (this._foundComponentsByNames) {
			return Promise.resolve(this._foundComponentsByNames);
		}

		this._foundComponentsByNames = Object.create(null);
		this._foundComponentsByDirs = Object.create(null);

		const cache = {};
		const symlinks = {};
		const statCache = {};

		const promises = this._componentsGlob
			.map(expression => new Promise((fulfill, reject) => {
				const componentFilesGlob = new glob.Glob(expression, {
					nosort: true,
					silent: true,
					nodir: true,
					cache,
					statCache,
					symlinks
				});

				componentFilesGlob
					.on('match', match => {
						const componentDescriptor =
							this._createComponentDescriptor(match);

						this._addComponent(componentDescriptor);
						this._eventBus.emit(
							'componentFound', componentDescriptor
						);
					})
					.on('error', error => reject(error))
					.on('end', fulfill);
			}));

		return Promise
			.all(promises)
			.then(() => this._foundComponentsByNames);
	}

	/**
	 * Watches the components for changing.
	 *
	 * @return {Promise} Promise of ready watchers.
	 */
	watch() {
		if (this._readyPromise) {
			return this._readyPromise;
		}

		const fileWatcher = chokidar.watch(Object.keys(this._foundComponentsByDirs), CHOKIDAR_OPTIONS);
		const fileWatcherReadyPromise = new Promise((fulfill, reject) => {
			fileWatcher
				.once('ready', () => fulfill())
				.once('error', error => reject(error));
		});
		// watch cat-component.json files
		const componentJsonWatcher = chokidar.watch(this._componentsGlob, CHOKIDAR_OPTIONS);
		const componentJsonReadyPromise = new Promise((fulfill, reject) => {
			componentJsonWatcher
				.once('ready', () => fulfill())
				.once('error', error => reject(error));
		});

		this._readyPromise = Promise
			.all([fileWatcherReadyPromise, componentJsonReadyPromise])
			.then(() => {
				this._fileWatcher = fileWatcher;
				fileWatcher
					.on('error', error => this._eventBus.emit('error', error))
				// component's directory is changed
					.on('change', filename => {
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
					.on('unlink', filename => {
						const component = this._recognizeComponent(filename);

						if (!component || component.path === filename) {
							return;
						}
						this.emit('change', {filename, component});
					})
					.on('add', filename => {
						const component = this._recognizeComponent(filename);
						if (!component || component.path === filename) {
							return;
						}
						this.emit('change', {filename, component});
					});

				componentJsonWatcher
					.on('error', error => this._eventBus.emit('error', error))
				// add new component
					.on('add', filename => {
						const newComponent = this._createComponentDescriptor(filename);
						this._addComponent(newComponent);
						this.emit('add', newComponent);
					})
				// change cat-component.json of the found component
					.on('change', filename => {
						const component = this._recognizeComponent(filename);
						if (!component) {
							return;
						}
						const newComponent = this._createComponentDescriptor(component.path);

						// because component name could be changed
						this._removeComponent(component);
						this.emit('unlink', component);

						this._addComponent(newComponent);
						this.emit('add', newComponent);
					})
				// unlink found component
					.on('unlink', filename => {
						const component = this._recognizeComponent(filename);
						if (!component) {
							return;
						}
						this._removeComponent(component);
						this.emit('unlink', component);
					});

				this.emit('watchReady');
				return [fileWatcher, componentJsonWatcher];
			});

		return this._readyPromise;
	}

	/**
	 * Close watchers
	 *
	 * @return {Promise} Promise of closed watchers.
	 */
	closeWatch() {
		this._fileWatcher = null;
		if (this._readyPromise) {
			const promise = this._readyPromise;

			this._readyPromise = null;

			return promise.then(watchers => watchers.forEach(watcher => watcher.close()));
		}

		return Promise.resolve();
	}

	/**
	 * Creates a descriptor for a found component.
	 * @param {string} filename The component's filename.
	 * @returns {{name: string, path: string, properties: Object}|null} The found
	 * component's descriptor.
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
			this._eventBus.emit('warn',
				`Component name "${componentName}" is incorrect (${COMPONENT_NAME_REGEXP.toString()}), skipping...`
			);
			return null;
		}

		if (typeof (properties.logic) !== 'string') {
			properties.logic = moduleHelper.DEFAULT_LOGIC_FILENAME;
		}

		if (typeof (properties.template) !== 'string') {
			this._eventBus.emit('warn',
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
	 * Recognizes a component by a path to its internal file.
	 * @param {string} filename The filename of the internal file of the component.
	 * @returns {{name: string, path: string, properties: Object}|null} The found
	 * component's descriptor.
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
	 * Removes a found component.
	 * @param {{name: string, path: string, properties: Object}?} component The found
	 * component's descriptor to remove.
	 * @private
	 */
	_removeComponent(component) {
		const dirName = path.dirname(component.path);
		const absolutePath = requireHelper.getAbsoluteRequirePath(component.path);

		requireHelper.clearCacheKey(absolutePath);

		delete this._foundComponentsByNames[component.name];
		delete this._foundComponentsByDirs[dirName];

		if (this._fileWatcher) {
			this._fileWatcher.unwatch(dirName);
		}
	}

	/**
	 * Adds a found component.
	 * @param {{name: string, path: string, properties: Object}?} component The found
	 * component's descriptor to add.
	 * @private
	 */
	_addComponent(component) {
		if (!component) {
			return;
		}

		if (component.name in this._foundComponentsByNames) {
			const existedComponent = this._foundComponentsByNames[component.name];
			this._eventBus.emit('warn',
				`Component ${component.path} has the same name as ${existedComponent.path} (${component.name}), skipping...`
			);
			return;
		}
		const dirName = path.dirname(component.path);
		this._foundComponentsByNames[component.name] = component;
		this._foundComponentsByDirs[dirName] = component;

		if (this._fileWatcher) {
			this._fileWatcher.add(dirName);
		}
	}

	/**
	 * Gets a component's inner path which is relative to CWD.
	 * @param {string} componentPath The path to the component.
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
