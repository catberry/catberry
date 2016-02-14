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

module.exports = BootstrapperBuilder;

var path = require('path'),
	util = require('util'),
	pfs = require('../promises/fs'),
	hrTimeHelper = require('../helpers/hrTimeHelper'),
	moduleHelper = require('../helpers/moduleHelper'),
	requireHelper = require('../helpers/requireHelper');

var BOOTSTRAPPER_FILENAME = 'Bootstrapper.js',
	BROWSER_ROOT_PATH = path.join(__dirname, '..', '..', 'browser'),
	STORE_FORMAT = '\n{name: \'%s\', constructor: %s}',
	STORES_REPLACE = '/**__stores**/',
	COMPONENT_FORMAT = '\n{' +
		'name: \'%s\', ' +
		'constructor: %s, ' +
		'properties: %s, ' +
		'templateSource: \'%s\', ' +
		'errorTemplateSource: %s' +
		'}',
	COMPONENTS_REPLACE = '/**__components**/',
	ROUTE_DEFINITIONS_REPLACE = '\'__routeDefinitions\'',
	ROUTE_DEFINITIONS_FILENAME = 'routes.js',
	REQUIRE_FORMAT = 'require(\'%s\')',
	INFO_BUILDING_BOOTSTRAPPER = 'Building bootstrapper...',
	INFO_BOOTSTRAPPER_BUILT = 'Bootstrapper has been built (%s)';

/**
 * Create new instance of bootstrapper builder.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 */
function BootstrapperBuilder($serviceLocator) {
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._templateProvider = $serviceLocator.resolve('templateProvider');
	this._logger = $serviceLocator.resolve('logger');
}

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
BootstrapperBuilder.prototype._templateProvider = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
BootstrapperBuilder.prototype._logger = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
BootstrapperBuilder.prototype._eventBus = null;

/**
 * Creates real bootstrapper code for bundle build.
 * @param {Object} stores Found stores.
 * @param {Object} components Found components.
 * @returns {Promise<string>} Promise for source code of real bootstrapper.
 */
BootstrapperBuilder.prototype.build = function(stores, components) {
	var self = this,
		bootstrapperTemplatePath = path.join(
			BROWSER_ROOT_PATH,
			BOOTSTRAPPER_FILENAME
		),
		routeDefinitionsPath = path.join(
			process.cwd(),
			ROUTE_DEFINITIONS_FILENAME
		);

	var startTime = hrTimeHelper.get();
	self._logger.info(INFO_BUILDING_BOOTSTRAPPER);

	return pfs.readFile(bootstrapperTemplatePath, {
		encoding: 'utf8'
	})
		.then(function(file) {
			return Promise.all([
				self._generateRequiresForStores(stores),
				self._generateRequiresForComponents(components)
			])
				.then(function(results) {
					return {
						file: file,
						stores: results[0],
						components: results[1]
					};
				});
		})
		.then(function(context) {
			// check if paths exist and create require statements or undefined
			return pfs.exists(routeDefinitionsPath)
				.then(function(isExists) {
					var requireString = isExists ? util.format(
						REQUIRE_FORMAT,
						'./' +
						path.relative(
							process.cwd(),
							requireHelper.getValidPath(routeDefinitionsPath)
						)) : 'null';
					return context.file
						.replace(COMPONENTS_REPLACE, context.components)
						.replace(STORES_REPLACE, context.stores)
						.replace(ROUTE_DEFINITIONS_REPLACE, requireString);
				});
		})
		.then(function(boostrapper) {
			self._logger.info(util.format(
				INFO_BOOTSTRAPPER_BUILT,
				hrTimeHelper.toMessage(hrTimeHelper.get(startTime))
			));
			return boostrapper;
		})
		.catch(function(reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Generates replacements for every store.
 * @param {Object} stores Found stores.
 * @returns {Promise<string>} Promise for JSON string that describes components.
 * @private
 */
BootstrapperBuilder.prototype._generateRequiresForStores = function(stores) {
	var storeRequires = [];
	Object
		.keys(stores)
		.forEach(function(storeName) {
			var requireExpression = stores[storeName].path ?
				util.format(
					REQUIRE_FORMAT,
					requireHelper.getValidPath(
						'./' +
						path.relative(process.cwd(), stores[storeName].path)
					)
				) : null;
			if (!requireExpression) {
				return;
			}
			storeRequires.push(util.format(
				STORE_FORMAT, storeName, requireExpression
			));
		});
	return Promise.resolve(storeRequires.join(','));
};

/**
 * Generates replacements for every component.
 * @returns {Promise<string>} Promise for JSON string that describes components.
 * @private
 */
BootstrapperBuilder.prototype._generateRequiresForComponents =
	function(components) {
		var self = this,
			promises = [];

		Object.keys(components)
			.forEach(function(componentName) {
				var componentDetails = components[componentName],
					componentPath = path.dirname(componentDetails.path),
					logicFile = components[componentName].properties.logic ||
						moduleHelper.DEFAULT_LOGIC_FILENAME,
					logicPath = path.resolve(
						componentPath, logicFile
					),
					relativeLogicPath = path
						.relative(process.cwd(), logicPath),
					constructor;

				try {
					constructor = require(logicPath);
				} catch (e) {
					self._eventBus.emit('error', e);
				}

				if (typeof (constructor) !== 'function' ||
					typeof (componentDetails.properties.template) !== 'string') {
					return;
				}

				var templates = [];

				templates.push({
					name: componentDetails.name,
					isErrorTemplate: false,
					path: path.resolve(
						componentPath, componentDetails.properties.template
					)
				});

				if (componentDetails.properties.errorTemplate) {
					var errorTemplateName = moduleHelper.getNameForErrorTemplate(
							componentDetails.name
						),
						errorTemplatePath = path.resolve(
							componentPath,
							componentDetails.properties.errorTemplate
						);
					templates.push({
						name: errorTemplateName,
						isErrorTemplate: true,
						path: errorTemplatePath
					});
				}

				// load sources
				var templatePromises = templates.map(function(template) {
					return pfs.readFile(template.path)
						.then(function(source) {
							var result = Object.create(template);
							result.source = source.toString();
							return result;
						});
				});

				var promise = Promise.all(templatePromises)
					// compile sources
					.then(function(templates) {
						var compilePromises = templates
							.map(function(template) {
								var compiled = self._templateProvider.compile(
									template.source, template.name
								);
								return Promise.resolve(compiled)
									.then(function(compiled) {
										var result = Object.create(template);
										result.compiledSource = compiled;
										return result;
									});
							});

						return Promise.all(compilePromises);
					})
					.then(function(templates) {
						var requireString = util.format(
								REQUIRE_FORMAT,
								'./' +
								requireHelper.getValidPath(relativeLogicPath)
							),
							templatesString = templates.length > 1 &&
							typeof (templates[1].compiledSource) === 'string' ?
								'\'' + escapeTemplateSource(
									templates[1].compiledSource
								) + '\'' : 'null';

						return util.format(COMPONENT_FORMAT,
							componentName, requireString,
							JSON.stringify(componentDetails.properties),
							escapeTemplateSource(templates[0].compiledSource),
							templatesString
						);
					});
				promises.push(promise);
			});

		return Promise.all(promises)
			.then(function(components) {
				return components.join(',');
			});
	};

/**
 * Escapes template source for including to bootstrapper.
 * @param {string} source Template compiled source.
 * @returns {string} escaped string.
 */
function escapeTemplateSource(source) {
	return source
		.replace(/(\\.)/g, '\\$&')
		.replace(/'/g, '\\\'')
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t');
}
