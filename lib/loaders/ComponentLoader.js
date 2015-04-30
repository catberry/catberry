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

var fs = require('../promises/fs'),
	requireHelper = require('../helpers/requireHelper'),
	moduleHelper = require('../helpers/moduleHelper'),
	URI = require('catberry-uri').URI,
	util = require('util'),
	path = require('path'),
	LoaderBase = require('../base/LoaderBase');

var INFO_WATCHING_FILES = 'Watching components for changes',
	WARN_COMPONENT_ROOT_NOT_FOUND = 'Component "%s" not found, ' +
		'blank page will be rendered',
	WARN_COMPONENT_LOGIC = 'File at %s of component "%s" not found ' +
	'or does not export a constructor function. Skipping...',
	INFO_COMPONENT_CHANGED =
		'Component "%s" has been changed, reinitializing...',
	INFO_COMPONENT_ADDED = 'Component "%s" has been added, initializing...',
	INFO_COMPONENT_UNLINKED = 'Component "%s" has been unlinked, removing...';

util.inherits(ComponentLoader, LoaderBase);

/**
 * Creates new instance of the component loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {Boolean} isRelease Release mode flag.
 * @constructor
 * @extends LoaderBase
 */
function ComponentLoader($serviceLocator, isRelease) {
	this._serviceLocator = $serviceLocator;
	this._logger = $serviceLocator.resolve('logger');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._templateProvider = $serviceLocator.resolve('templateProvider');
	this._componentFinder = $serviceLocator.resolve('componentFinder');
	this._isRelease = Boolean(isRelease);
	LoaderBase.call(this, $serviceLocator.resolveAll('componentTransform'));
}

/**
 * Current release flag.
 * @type {boolean}
 * @private
 */
ComponentLoader.prototype._isRelease = false;

/**
 * Current map of loaded components by names.
 * @type {Object}
 * @private
 */
ComponentLoader.prototype._loadedComponents = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ComponentLoader.prototype._logger = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
ComponentLoader.prototype._eventBus = null;

/**
 * Current component finder.
 * @type {ComponentFinder}
 * @private
 */
ComponentLoader.prototype._componentFinder = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ComponentLoader.prototype._templateProvider = null;

/**
 * Loads all components into a memory.
 * @returns {Promise<Object>} Promise for map of loaded components.
 */
ComponentLoader.prototype.load = function () {
	if (this._loadedComponents) {
		return Promise.resolve(this._loadedComponents);
	}

	var self = this,
		isDocumentFound = false,
		result = {};

	return this._componentFinder.find()
		.then(function (components) {
			var componentPromises = Object.keys(components)
				.map(function (componentName) {
					var componentDetails = components[componentName];
					if (moduleHelper
							.isDocumentComponent(componentDetails.name)) {
						isDocumentFound = true;
					}
					return self._getComponent(componentDetails);
				});

			return Promise.all(componentPromises);
		})
		.then(function (componentList) {
			componentList.forEach(function (component) {
				if (!component || typeof(component) !== 'object') {
					return;
				}

				result[component.name] = component;
			});

			self._loadedComponents = result;

			if (!self._isRelease) {
				self._logger.info(INFO_WATCHING_FILES);
				self._componentFinder.watch();
				self._handleChanges();
			}
			if (!isDocumentFound) {
				self._logger.warn(util.format(
					WARN_COMPONENT_ROOT_NOT_FOUND,
					moduleHelper.DOCUMENT_COMPONENT_NAME
				));
			}
			self._eventBus.emit('allComponentsLoaded', result);
			return self._loadedComponents;
		});
};

/**
 * Gets current map of components by names.
 * @returns {Object} Map of components by names.
 */
ComponentLoader.prototype.getComponentsByNames = function () {
	return this._loadedComponents || {};
};

/**
 * Gets component object by found component details.
 * @param {Object} componentDetails Found details.
 * @returns {Object} Component object.
 * @private
 */
ComponentLoader.prototype._getComponent = function (componentDetails) {
	var constructor,
		logicPath = getLogicPath(componentDetails);
	try {
		constructor = require(logicPath);
	} catch (e) {
		this._eventBus.emit('error', e);
		return Promise.resolve(null);
	}

	if (typeof(constructor) !== 'function') {
		this._logger.warn(util.format(
			WARN_COMPONENT_LOGIC, logicPath, componentDetails.name
		));
		return Promise.resolve(null);
	}

	var self = this,
		component = Object.create(componentDetails);
	component.constructor = constructor;

	return this._loadTemplateSources(component)
		.then(function () {
			return self._compileTemplates(component);
		})
		.then(function (compiledTemplates) {
			return self._applyTransforms(component)
				.then(function (transformed) {
					component = transformed;
					return self._registerTemplates(
						component, compiledTemplates
					);
				});
		})
		.then(function () {
			self._eventBus.emit('componentLoaded', component);
			return component;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
			return null;
		});
};

/**
 * Handles watch changes.
 * @private
 */
ComponentLoader.prototype._handleChanges = function () {
	var self = this;

	var loadComponent = function (componentDetails) {
		self._getComponent(componentDetails)
			.then(function (component) {
				self._loadedComponents[componentDetails.name] = component;
			});
	};

	this._componentFinder
		.on('add', function (componentDetails) {
			self._logger.info(util.format(
				INFO_COMPONENT_ADDED, componentDetails.path
			));
			requireHelper.clearCacheKey(
				getLogicPath(componentDetails)
			);
			loadComponent(componentDetails);
		})
		.on('changeLogic', function (componentDetails) {
			self._logger.info(util.format(
				INFO_COMPONENT_CHANGED, componentDetails.path
			));
			requireHelper.clearCacheKey(
				getLogicPath(componentDetails)
			);
			loadComponent(componentDetails);
		})
		.on('changeTemplates', function (componentDetails) {
			self._logger.info(util.format(
				INFO_COMPONENT_CHANGED, componentDetails.path
			));
			loadComponent(componentDetails);
		})
		.on('unlink', function (componentDetails) {
			self._logger.info(util.format(
				INFO_COMPONENT_UNLINKED, componentDetails.path
			));
			requireHelper.clearCacheKey(
				getLogicPath(componentDetails)
			);
			delete self._loadedComponents[componentDetails.name];
		});
};

/**
 * Loads template sources from files.
 * @param {Object} component Component.
 * @returns {Promise} Promise for nothing.
 * @private
 */
ComponentLoader.prototype._loadTemplateSources = function (component) {
	return Promise.resolve()
		// load template sources
		.then(function () {
			var templateSourcePromise = Promise.resolve()
				.then(function () {
					var templatePath = path.resolve(
						path.dirname(component.path),
						component.properties.template
					);
					return fs.readFile(templatePath)
						.then(function (source) {
							component.templateSource = source.toString();
						});
				});

			var errorTemplateSourcePromise = Promise.resolve()
				.then(function () {
					component.errorTemplateSource = null;
					var relativePath = component.properties.errorTemplate;
					if (typeof(relativePath) !== 'string') {
						return;
					}
					var templatePath = path.resolve(
						path.dirname(component.path),
						component.properties.errorTemplate
					);
					return fs.readFile(templatePath)
						.then(function (source) {
							component.errorTemplateSource = source.toString();
						});
				});

			return Promise.all([
				templateSourcePromise, errorTemplateSourcePromise
			]);
		});
};

/**
 * Compiles template sources of the component.
 * @param {Object} component Component.
 * @returns {Promise} Promise for nothing.
 * @private
 */
ComponentLoader.prototype._compileTemplates = function (component) {
	var self = this;
	return Promise.resolve()
		.then(function () {
			var templateCompilePromise = Promise.resolve()
				.then(function () {
					return self._templateProvider.compile(
						component.templateSource, component.name
					);
				});
			var errorTemplateName = moduleHelper.getNameForErrorTemplate(
					component.name
				),
				errorTemplateCompilePromise = Promise.resolve()
					.then(function () {
						if (!component.errorTemplateSource) {
							return null;
						}
						return self._templateProvider.compile(
							component.errorTemplateSource, errorTemplateName
						);
					});

			return Promise.all([
				templateCompilePromise,
				errorTemplateCompilePromise
			]);
		})
		.then(function (compiledTemplates) {
			return {
				template: compiledTemplates[0],
				errorTemplate: compiledTemplates[1] || null
			};
		});
};

/**
 * Registers templates into component and template provider.
 * @param {Object} component Component.
 * @param {{template: string, errorTemplate: string}} templates
 * Compiled templates.
 * @private
 */
ComponentLoader.prototype._registerTemplates = function (component, templates) {
	this._templateProvider.registerCompiled(
		component.name, templates.template
	);

	var self = this;
	component.template = {
		render: function (context) {
			return self._templateProvider.render(
				component.name, context
			);
		}
	};

	if (!templates.errorTemplate) {
		return;
	}

	var errorTemplateName = moduleHelper.getNameForErrorTemplate(
		component.name
	);
	this._templateProvider.registerCompiled(
		errorTemplateName, templates.errorTemplate
	);

	component.errorTemplate = {
		render: function (context) {
			return self._templateProvider.render(
				errorTemplateName, context
			);
		}
	};
};

/**
 * Gets absolute path to a logic file.
 * @param {Object} componentDetails Component details object.
 * @returns {String} Absolute path to a logic file.
 */
function getLogicPath(componentDetails) {
	return path.resolve(
		path.dirname(componentDetails.path), componentDetails.properties.logic
	);
}