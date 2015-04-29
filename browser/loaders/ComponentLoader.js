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

module.exports = ComponentLoader;

var moduleHelper = require('../../lib/helpers/moduleHelper'),
	util = require('util'),
	LoaderBase = require('../../lib/base/LoaderBase');

util.inherits(ComponentLoader, LoaderBase);

/**
 * Creates new instance of the component loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 * @extends LoaderBase
 */
function ComponentLoader($serviceLocator) {
	this._serviceLocator = $serviceLocator;
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._templateProvider = $serviceLocator.resolve('templateProvider');
	LoaderBase.call(this, $serviceLocator.resolveAll('componentTransform'));
}

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
ComponentLoader.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
ComponentLoader.prototype._serviceLocator = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ComponentLoader.prototype._templateProvider = null;

/**
 * Current map of loaded components by names.
 * @type {Object} Map of components by names.
 * @private
 */
ComponentLoader.prototype._loadedComponents = null;

/**
 * Loads components when it is in a browser.
 * @returns {Promise} Promise for nothing.
 */
ComponentLoader.prototype.load = function () {
	if (this._loadedComponents) {
		return Promise.resolve(this._loadedComponents);
	}

	this._loadedComponents = {};

	var self = this;
	return Promise.resolve()
		.then(function () {
			var componentPromises = self._serviceLocator.resolveAll('component')
				.map(function (componentDetails) {
					return self._processComponent(componentDetails);
				});

			return Promise.all(componentPromises);
		})
		.then(function (components) {
			components.forEach(function (component) {
				if (!component || typeof(component) !== 'object') {
					return;
				}
				self._loadedComponents[component.name] = component;
			});
			self._eventBus.emit('allComponentsLoaded', components);
			return self._loadedComponents;
		});
};

/**
 * Processes component and apply required operations.
 * @param {Object} componentDetails Loaded component details.
 * @returns {Object} Component object.
 * @private
 */
ComponentLoader.prototype._processComponent = function (componentDetails) {
	var self = this,
		component = Object.create(componentDetails);

	return this._applyTransforms(component)
		.then(function (transformed) {
			component = transformed;
			self._templateProvider.registerCompiled(
				component.name, component.templateSource
			);
			component.template = {
				render: function (dataContext) {
					return self._templateProvider.render(
						component.name, dataContext
					);
				}
			};
			if (typeof(component.errorTemplateSource) === 'string') {
				var errorTemplateName = moduleHelper.getNameForErrorTemplate(
					component.name
				);
				self._templateProvider.registerCompiled(
					errorTemplateName, component.errorTemplateSource
				);
				component.errorTemplate = {
					render: function (dataContext) {
						return self._templateProvider.render(
							errorTemplateName, dataContext
						);
					}
				};
			}
			self._eventBus.emit('componentLoaded', component);
			return component;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
			return null;
		});
};

/**
 * Gets map of components by names.
 * @returns {Object} Map of components by names.
 */
ComponentLoader.prototype.getComponentsByNames = function () {
	return this._loadedComponents || {};
};