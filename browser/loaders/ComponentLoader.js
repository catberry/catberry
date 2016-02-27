'use strict';

const moduleHelper = require('../../lib/helpers/moduleHelper');
const LoaderBase = require('../../lib/base/LoaderBase');

class ComponentLoader extends LoaderBase {

	/**
	 * Creates new instance of the component loader.
	 * @param {ServiceLocator} locator Locator to resolve dependencies.
	 */
	constructor(locator) {
		var componentTransforms;
		try {
			componentTransforms = locator.resolveAll('componentTransform');
		} catch (e) {
			componentTransforms = [];
		}
		super(componentTransforms);

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
	 * Loads components when it is in a browser.
	 * @returns {Promise} Promise for nothing.
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
				components.forEach(component => componentPromises.unshift(
					this._processComponent(component)
				));
				return Promise.all(componentPromises);
			})
			.then(components => {
				components.forEach(component => {
					if (!component || typeof (component) !== 'object') {
						return;
					}
					this._loadedComponents[component.name] = component;
				});
				this._eventBus.emit('allComponentsLoaded', components);
				return this._loadedComponents;
			});
	}

	/**
	 * Processes component and apply required operations.
	 * @param {Object} componentDetails Loaded component details.
	 * @returns {Object} Component object.
	 * @private
	 */
	_processComponent(componentDetails) {
		var component = Object.create(componentDetails);

		return this._applyTransforms(component)
			.then(transformed => {
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
	 * Gets map of components by names.
	 * @returns {Object} Map of components by names.
	 */
	getComponentsByNames() {
		return this._loadedComponents || Object.create(null);
	}
}

module.exports = ComponentLoader;
