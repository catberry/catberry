'use strict';

const fs = require('../promises/fs');
const requireHelper = require('../helpers/requireHelper');
const moduleHelper = require('../helpers/moduleHelper');
const loadHelper = require('../helpers/loadHelper');
const templateHelper = require('../helpers/templateHelper');
const path = require('path');
const LoaderBase = require('../base/LoaderBase');

/**
 * Implements the component Loader class for server environment.
 */
class ComponentLoader extends LoaderBase {

	/**
	 * Creates new instance of the component loader.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {
		var componentTransforms;
		try {
			componentTransforms = locator.resolveAll('componentTransform');
		} catch (e) {
			componentTransforms = [];
		}
		super(locator, componentTransforms);

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current template provider list.
		 * @type {Array<TemplateProvider>}
		 * @private
		 */
		this._templateProviders = templateHelper.resolveTemplateProviders(locator);

		/**
		 * Current component finder.
		 * @type {ComponentFinder}
		 * @private
		 */
		this._componentFinder = locator.resolve('componentFinder');

		/**
		 * Current release flag.
		 * @type {boolean}
		 * @private
		 */
		this._isRelease = Boolean(locator.resolve('config').isRelease);

		/**
		 * Current map of the loaded components by their names.
		 * @type {Object}
		 * @private
		 */
		this._loadedComponents = null;
	}

	/**
	 * Loads all components into the memory.
	 * @returns {Promise<Object>} The promise for map of loaded components.
	 */
	load() {
		if (this._loadedComponents) {
			return Promise.resolve(this._loadedComponents);
		}

		var isDocumentFound = false;
		const result = Object.create(null);

		return this._componentFinder.find()
			.then(components => {
				const componentPromises = Object.keys(components)
					.map(componentName => {
						const componentDetails = components[componentName];
						if (moduleHelper.isDocumentComponent(componentDetails.name)) {
							isDocumentFound = true;
						}
						return this._getComponent(componentDetails);
					});

				return Promise.all(componentPromises);
			})
			.then(componentList => {
				componentList.forEach(component => {
					if (!component || typeof (component) !== 'object') {
						return;
					}

					result[component.name] = component;
				});

				this._loadedComponents = result;

				if (!this._isRelease) {
					this._eventBus.emit('info', 'Watching components for changes...');
					this._componentFinder.watch();
					this._handleChanges();
				}
				if (!isDocumentFound) {
					this._eventBus.emit('warn',
						`Component "${moduleHelper.DOCUMENT_COMPONENT_NAME}" not found, blank page will be rendered`
					);
				}
				this._eventBus.emit('allComponentsLoaded', result);
				return this._loadedComponents;
			});
	}

	/**
	 * Gets current map of components by their names.
	 * @returns {Object} The map of components by their names.
	 */
	getComponentsByNames() {
		return this._loadedComponents || Object.create(null);
	}

	/**
	 * Gets a component object by the found component details.
	 * @param {Object} componentDetails The found details.
	 * @returns {Object} The component object.
	 * @private
	 */
	_getComponent(componentDetails) {
		const logicPath = this._getLogicPath(componentDetails);

		var constructor;
		try {
			constructor = require(logicPath);
		} catch (e) {
			this._eventBus.emit('error', e);
			return Promise.resolve(null);
		}

		if (typeof (constructor) !== 'function') {
			this._eventBus.emit('warn',
				`File at ${logicPath} of component "${componentDetails.name}" not found or does not export a constructor function. Skipping...`
			);
			return Promise.resolve(null);
		}

		var component = Object.create(componentDetails);
		component.constructor = constructor;

		return loadHelper.loadTemplateSources(component)
			.then(() => loadHelper.assignTemplateProviders(component, this._templateProviders))
			.then(() => loadHelper.compileTemplates(component))
			.then(() => this._applyTransforms(component)
					.then(transformed => {
						if (!transformed) {
							throw new Error(`Transformation for the "${component.name}" component returned a bad result`);
						}
						component = transformed;
						return templateHelper.registerTemplates(component);
					})
			)
			.then(() => {
				this._eventBus.emit('componentLoaded', component);
				return component;
			})
			.catch(reason => {
				this._eventBus.emit('error', reason);
				return null;
			});
	}

	/**
	 * Handles changes while watching.
	 * @private
	 */
	_handleChanges() {
		const loadComponent = componentDetails => this._getComponent(componentDetails)
			.then(component => (this._loadedComponents[componentDetails.name] = component));

		this._componentFinder
			.on('add', componentDetails => {
				this._eventBus.emit('info', `Component "${componentDetails.path}" has been added, initializing...`);
				requireHelper.clearCacheKey(this._getLogicPath(componentDetails));
				loadComponent(componentDetails);
			})
			.on('changeLogic', componentDetails => {
				this._eventBus.emit('info', `Scripts of the "${componentDetails.path}" component have been changed, reinitializing...`);
				requireHelper.clearCacheKey(this._getLogicPath(componentDetails));
				loadComponent(componentDetails);
			})
			.on('changeTemplates', componentDetails => {
				this._eventBus.emit('info', `Template of the "${componentDetails.path}" component have been changed, reinitializing...`);
				loadComponent(componentDetails);
			})
			.on('unlink', componentDetails => {
				this._eventBus.emit('info', `Component "${componentDetails.path}" has been unlinked, removing...`);
				requireHelper.clearCacheKey(this._getLogicPath(componentDetails));
				delete this._loadedComponents[componentDetails.name];
			});
	}

	/**
	 * Gets an absolute path to the component's logic file.
	 * @param {Object} componentDetails The component details object.
	 * @returns {string} The absolute path to the logic file.
	 * @private
	 */
	_getLogicPath(componentDetails) {
		return path.resolve(
			path.dirname(componentDetails.path), componentDetails.properties.logic
		);
	}
}

module.exports = ComponentLoader;
