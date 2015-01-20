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
	path = require('path');

var TEMPLATE_ERROR_POSTFIX = '--error',
	INFO_WATCHING_FILES = 'Watching components for changes',
	INFO_COMPONENTS_CHANGED = 'Components have been changed, reloading...',
	WARN_COMPONENT_ROOT_NOT_FOUND = 'Component "%s" not found, ' +
		'blank page will be rendered',
	WARN_COMPONENT_LOGIC = 'Logic file of component %s not found ' +
	'or does not export a constructor function at path %s';

/**
 * Creates new instance of component loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {Boolean} isRelease Release mode flag.
 * @constructor
 */
function ComponentLoader($serviceLocator, isRelease) {
	this._serviceLocator = $serviceLocator;
	this._logger = $serviceLocator.resolve('logger');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._componentFinder = $serviceLocator.resolve('componentFinder');
	this._isRelease = Boolean(isRelease);
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
 * Loads all components into a memory.
 * @returns {Promise<Object>} Promise for map of loaded components.
 */
ComponentLoader.prototype.load = function () {
	var self = this,
		isDocumentFound = false,
		result = {};

	return this._componentFinder.find()
		.then(function (details) {
			var componentPromises = details.map(function (detailsUnit) {
				if (moduleHelper.isDocumentComponent(detailsUnit.name)) {
					isDocumentFound = true;
				}
				return self._getComponent(detailsUnit);
			});

			return Promise.all(componentPromises);
		})
		.then(function (componentList) {
			componentList.forEach(function (component) {
				if (!component) {
					return;
				}

				result[component.name] = component;
			});

			self._loadedComponents = result;

			if (!self._isRelease) {
				self._logger.info(INFO_WATCHING_FILES);
				self._componentFinder.watch(function () {
					self._logger.info(INFO_COMPONENTS_CHANGED);
					requireHelper.clearCache();
					self.load();
				});
			}
			if (!isDocumentFound) {
				self._logger.warn(util.format(
					WARN_COMPONENT_ROOT_NOT_FOUND, moduleHelper.DOCUMENT_COMPONENT_NAME
				));
			}
			self._eventBus.emit('allComponentsLoaded', result);
			return self._loadedComponents;
		});
};

/**
 * Gets current map of components by names.
 * @returns {Object} Map of components by name.
 */
ComponentLoader.prototype.getComponentsByNames = function () {
	return this._loadedComponents || {};
};

/**
 * Gets component object by found component details.
 * @param {Object} componentDetails Found details.
 * @returns {Object} Component object
 * @private
 */
ComponentLoader.prototype._getComponent = function (componentDetails) {
	var constructor,
		logicFile = componentDetails.properties.logic ||
			moduleHelper.DEFAULT_LOGIC_FILENAME,
		logicPath = path.resolve(
			path.dirname(componentDetails.path), logicFile
		);
	try {
		constructor = require(logicPath);
	} catch (e) {
		this._eventBus.emit('error', e);
	}

	if (typeof(constructor) !== 'function') {
		this._logger.warn(util.format(
			WARN_COMPONENT_LOGIC, componentDetails.name, logicPath
		));
		return null;
	}

	var componentContext = Object.create(this._contextFactory.createStub());
	componentContext.name = componentDetails.name;
	constructor.prototype.$context = componentContext;

	var result = Object.create(componentDetails);
	result.constructor = constructor;

	var templatePromises = [fs.readFile(componentDetails.template)];

	if (componentDetails.errorTemplate) {
		templatePromises.push(fs.readFile(componentDetails.errorTemplate));
	}

	var self = this;
	return Promise.all(templatePromises)
		.then(function (sources) {
			var compiled = sources.map(function (source) {
				return self._templateProvider.compile(source);
			});

			self._templateProvider.registerCompiled(
				componentDetails.name, compiled[0]
			);
			result.template = {
				render: function (context) {
					return self._templateProvider.render(
						componentDetails.name, context
					);
				}
			};

			if (compiled[1]) {
				var errorTemplateName = componentDetails.name +
					TEMPLATE_ERROR_POSTFIX;
				self._templateProvider.registerCompiled(
					errorTemplateName, compiled[1]
				);
				result.errorTemplate = {
					render: function (context) {
						return self._templateProvider.render(
							errorTemplateName, context
						);
					}
				};
			}

			self._eventBus.emit('componentLoaded', result);
			return result;
		});
};