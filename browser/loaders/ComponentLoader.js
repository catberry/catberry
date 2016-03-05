'use strict';

const moduleHelper = require('../../lib/helpers/moduleHelper');
const LoaderBase = require('../../lib/base/LoaderBase');

class ComponentLoader extends LoaderBase {

	/**
	 * Creates a new instance of the component loader.
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
		 * Current service locator.
		 * @type {ServiceLocator}
		 * @private
		 */
		this._serviceLocator = locator;

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current template provider.
		 * @type {TemplateProvider}
		 * @private
		 */
		this._templateProvider = locator.resolve('templateProvider');

		/**
		 * Current map of loaded components by names.
		 * @type {Object} Map of components by names.
		 * @private
		 */
		this._loadedComponents = null;
	}

	/**
	 * Loads components inside the browser bundle.
	 * @returns {Promise<Object>} The promise for loaded components.
	 */
	load() {
		if (this._loadedComponents) {
			return Promise.resolve(this._loadedComponents);
		}

		this._loadedComponents = Object.create(null);

		return Promise.resolve()
			.then(() => this._serviceLocator.resolveAll('component'))
			.catch(() => [])
			.then(components => {
				const componentPromises = [];
				// the list is a stack, we should reverse it
				components.forEach(component => {
					if (!component || typeof (component) !== 'object') {
						return;
					}
					componentPromises.unshift(this._processComponent(component));
				});
				return Promise.all(componentPromises);
			})
			.then(components => {
				components.forEach(component => {
					if (!component) {
						return;
					}
					this._loadedComponents[component.name] = component;
				});
				this._eventBus.emit('allComponentsLoaded', components);
				return this._loadedComponents;
			});
	}

	/**
	 * Processes a component and applies required operations.
	 * @param {Object} componentDetails The loaded component details.
	 * @returns {Promise<Object>} The promise for the component object.
	 * @private
	 */
	_processComponent(componentDetails) {
		var component = Object.create(componentDetails);

		return this._applyTransforms(component)
			.then(transformed => {
				if (!transformed) {
					throw new Error(`Transformation for the "${componentDetails.name}" component returned a bad result`);
				}
				component = transformed;
				this._templateProvider.registerCompiled(
					component.name, component.templateSource
				);
				component.template = {
					render: dataContext => this._templateProvider.render(component.name, dataContext)
				};
				if (typeof (component.errorTemplateSource) === 'string') {
					const errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
					this._templateProvider.registerCompiled(errorTemplateName, component.errorTemplateSource);
					component.errorTemplate = {
						render: dataContext => this._templateProvider.render(errorTemplateName, dataContext)
					};
				}
				this._eventBus.emit('componentLoaded', component);
				return component;
			})
			.catch(reason => {
				this._eventBus.emit('error', reason);
				return null;
			});
	}

	/**
	 * Gets a map of components by their names.
	 * @returns {Object} The map of the components by their names.
	 */
	getComponentsByNames() {
		return this._loadedComponents || Object.create(null);
	}
}

module.exports = ComponentLoader;
