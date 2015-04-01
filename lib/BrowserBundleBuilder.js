/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
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

module.exports = BrowserBundleBuilder;

var path = require('path'),
	util = require('util'),
	fs = require('./promises/fs'),
	ncp = require('ncp').ncp,
	mkdirp = require('mkdirp'),
	rimraf = require('rimraf'),
	UglifyJS = require('uglify-js'),
	browserify = require('browserify'),
	moduleHelper = require('./helpers/moduleHelper'),
	requireHelper = require('./helpers/requireHelper'),
	packageDescriptionPath = path.join(process.cwd(), 'package.json'),
	packageDescription;

try {
	packageDescription = require(packageDescriptionPath);
} catch (e) {
	// ok, nothing to do here
}

var DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public'),
	BROWSER_ROOT_PATH = path.join(__dirname, '..', 'browser'),
	INFO_BUILDING_BUNDLE = 'Building browser script bundle...',
	INFO_LOOKING_FOR_MODULES = 'Looking for stores and components...',
	INFO_OPTIMIZING_BROWSER_BUNDLE = 'Optimizing code of browser bundle...',
	INFO_WATCHING_FILES = 'Watching files for changes to rebuild bundle...',
	INFO_FILES_CHANGED = 'Files were changed, rebuilding browser bundle...',
	INFO_COPYING_ASSETS = 'Copying assets of every component ' +
		'to public directory...',
	TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js',
	BOOTSTRAPPER_FILENAME = 'Bootstrapper.js',
	BROWSER_SCRIPT_FILENAME = 'browser.js',
	BUNDLE_FILENAME = 'bundle.js',
	STORE_FORMAT = '\n{name: \'%s\', constructor: %s}',
	STORES_REPLACE = '/**__stores**/',
	COMPONENT_FORMAT = '\n{' +
		'name: \'%s\', ' +
		'constructor: %s, ' +
		'properties: %s, ' +
		'templateSource: \'%s\', ' +
		'errorTemplateSource: %s' +
		'}',
	ASSETS_DIRECTORY_NAME = 'assets',
	COMPONENTS_REPLACE = '/**__components**/',
	ROUTE_DEFINITIONS_REPLACE = '\'__routeDefinitions\'',
	ROUTE_DEFINITIONS_FILENAME = 'routes.js',
	TEMPLATE_ENGINE_REPLACE = '\'__templateEngine\'',
	REQUIRE_FORMAT = 'require(\'%s\')',
	HEADER_FORMAT = '/* %s: %s */\n',
	BRACKETS_REGEXP = /(?:^\[)|(?:\]$)/g;

/**
 * Creates new instance of the browser bundle builder.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 */
function BrowserBundleBuilder($serviceLocator) {
	var config = $serviceLocator.resolve('config');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._logger = $serviceLocator.resolve('logger');
	this._publicPath = config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
	this._templateProvider = $serviceLocator.resolve('templateProvider');
	this._injectionFinder = $serviceLocator.resolve('injectionFinder');
	this._storeFinder = $serviceLocator.resolve('storeFinder');
	this._componentFinder = $serviceLocator.resolve('componentFinder');
	this._isRelease = Boolean(config.isRelease);
}

/**
 * Determines if package was build at least one time.
 * @type {boolean}
 * @private
 */
BrowserBundleBuilder.prototype._isBuilt = false;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
BrowserBundleBuilder.prototype._templateProvider = null;

/**
 * Current store finder.
 * @type {StoreFinder}
 * @private
 */
BrowserBundleBuilder.prototype._storeFinder = null;

/**
 * Current component finder.
 * @type {ComponentFinder}
 * @private
 */
BrowserBundleBuilder.prototype._componentFinder = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
BrowserBundleBuilder.prototype._eventBus = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
BrowserBundleBuilder.prototype._logger = null;

/**
 * Is current application mode release.
 * @type {boolean}
 * @private
 */
BrowserBundleBuilder.prototype._isRelease = false;

/**
 * Current path where to publish bundle.
 * @type {string}
 * @private
 */
BrowserBundleBuilder.prototype._publicPath = '';

/**
 * Current set of components.
 * @type {Object}
 * @private
 */
BrowserBundleBuilder.prototype._currentComponents = null;

/**
 * Current set of stores.
 * @type {Object}
 * @private
 */
BrowserBundleBuilder.prototype._currentStores = null;

/**
 * Builds the browser bundle.
 * @returns {Promise} Promise for nothing.
 */
BrowserBundleBuilder.prototype.build = function () {
	var self = this,
		startTime = Date.now();

	var bootstrapperPath = path.join(
			process.cwd(),
			TEMPORARY_BOOTSTRAPPER_FILENAME
		),
		entryPath = path.join(process.cwd(), BROWSER_SCRIPT_FILENAME),
		bundlePath = path.join(this._publicPath, BUNDLE_FILENAME),
		bundler = browserify({
			debug: !this._isRelease
		});

	return fs.exists(this._publicPath)
		.then(function (isExists) {
			return !isExists ? fs.makeDir(self._publicPath) : null;
		})
		.then(function () {
			return self._findModules();
		})
		.then(function () {
			var assetsPath = path.join(self._publicPath, ASSETS_DIRECTORY_NAME);
			return remove(assetsPath)
				.catch(function () {
					// nothing to do
				});
		})
		.then(function () {
			return self._copyComponentAssets();
		})
		.then(this._createRealBootstrapper.bind(this))
		.then(function (realBootstrapper) {
			return fs.writeFile(bootstrapperPath, realBootstrapper);
		})
		.then(function () {
			return fs.exists(entryPath);
		})
		.then(function (isExists) {
			// if user defined browser entry script then add it
			return isExists ? bundler.add(entryPath) : null;
		})
		.then(function () {
			return new Promise(function (fulfill, reject) {
				self._logger.info(INFO_BUILDING_BUNDLE);
				bundler.bundle(function (error, buffer) {
					if (error) {
						reject(error);
						return;
					}
					fulfill(buffer.toString());
				});
			});
		})
		.then(function (source) {
			var finalSource = source;
			if (self._isRelease) {
				self._logger.info(INFO_OPTIMIZING_BROWSER_BUNDLE);
				finalSource = self._optimize(source);
			}

			if (packageDescription &&
				packageDescription.name &&
				packageDescription.version) {
				finalSource = util.format(
					HEADER_FORMAT,
					packageDescription.name,
					packageDescription.version
				) + finalSource;
			}
			return fs.writeFile(bundlePath, finalSource);
		})
		.then(function () {
			return fs.unlink(bootstrapperPath);
		})
		.then(function () {
			self._isBuilt = true;
			self._eventBus.emit('bundleBuilt', {
				path: bundlePath,
				time: Date.now() - startTime
			});
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Watches files for changes if application is in debug mode.
 * @private
 */
BrowserBundleBuilder.prototype._watchFiles = function () {
	if (this._isRelease) {
		return;
	}

	var self = this,
		changeHandler = function () {
			if (!self._isBuilt) {
				return;
			}
			self._logger.info(INFO_FILES_CHANGED);
			self.build();
		};

	this._logger.info(INFO_WATCHING_FILES);
	this._storeFinder.watch(changeHandler);
	this._componentFinder.watch(changeHandler);
};

/**
 * Creates real bootstrapper code for bundle build.
 * @returns {Promise<string>} Promise for source code of real bootstrapper.
 * @private
 */
BrowserBundleBuilder.prototype._createRealBootstrapper = function () {
	var self = this,
		bootstrapperTemplatePath = path.join(
			BROWSER_ROOT_PATH,
			BOOTSTRAPPER_FILENAME
		),
		routeDefinitionsPath = path.join(
			process.cwd(),
			ROUTE_DEFINITIONS_FILENAME
		);

	this._logger.info(INFO_LOOKING_FOR_MODULES);

	return fs.readFile(bootstrapperTemplatePath, {encoding: 'utf8'})
		.then(function (file) {
			return Promise.all([
				self._generateRequiresForStores(),
				self._generateRequiresForComponents()
			])
				.then(function (results) {
					return {
						file: file,
						stores: results[0],
						components: results[1]
					};
				});
		})
		.then(function (context) {
			// check if paths exist and create require statements or undefined
			return fs.exists(routeDefinitionsPath)
				.then(function (isExists) {
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
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Finds modules such as stores and components.
 * @returns {Promise} Promise for nothing.
 * @private
 */
BrowserBundleBuilder.prototype._findModules = function () {
	var self = this;
	return Promise.all([
		this._storeFinder.find(),
		this._componentFinder.find()
	])
		.then(function (found) {
			self._currentStores = found[0];
			self._currentComponents = found[1];
			self._watchFiles();
		});
};

/**
 * Copies assets of every component to public assets directory.
 * @returns {Promise} Promise for nothing.
 * @private
 */
BrowserBundleBuilder.prototype._copyComponentAssets = function () {
	this._logger.info(INFO_COPYING_ASSETS);
	var self = this,
		found = this._currentComponents,
		promises = Object.keys(found)
			.map(function (componentName) {
				var directory = path.join(
						path.dirname(found[componentName].path),
						ASSETS_DIRECTORY_NAME
					),
					destination = path.join(
						self._publicPath, ASSETS_DIRECTORY_NAME,
						found[componentName].name
					);

				fs.exists(directory)
					.then(function (isExists) {
						return !isExists ? createDir(destination) : null;
					})
					.then(function () {
						return copy(directory, destination);
					});
			});
	return Promise.all(promises);
};

/**
 * Generates replacements for every store.
 * @returns {Promise<string>} Promise for JSON string that describes components.
 * @private
 */
BrowserBundleBuilder.prototype._generateRequiresForStores = function () {
	var stores = [],
		found = this._currentStores;
	Object
		.keys(found)
		.forEach(function (storeName) {
			var requireExpression = found[storeName].path ?
				util.format(
					REQUIRE_FORMAT,
					requireHelper.getValidPath(
						'./' +
						path.relative(process.cwd(), found[storeName].path)
					)
				) : null;
			if (!requireExpression) {
				return;
			}
			stores.push(util.format(
				STORE_FORMAT, storeName, requireExpression
			));
		});
	return Promise.resolve(stores.join(','));
};

/**
 * Generates replacements for every component.
 * @returns {Promise<string>} Promise for JSON string that describes components.
 * @private
 */
BrowserBundleBuilder.prototype._generateRequiresForComponents = function () {
	var self = this,
		found = this._currentComponents,
		promises = [];

	Object.keys(found)
		.forEach(function (componentName) {
			var componentDetails = found[componentName],
				componentPath = path.dirname(componentDetails.path),
				logicFile = found[componentName].properties.logic ||
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

			if (typeof(constructor) !== 'function' ||
				typeof(componentDetails.properties.template) !== 'string') {
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
			var templatePromises = templates.map(function (template) {
				return fs.readFile(template.path)
					.then(function (source) {
						var result = Object.create(template);
						result.source = source.toString();
						return result;
					});
			});

			var promise = Promise.all(templatePromises)
				// compile sources
				.then(function (templates) {
					var compilePromises = templates.map(function (template) {
						var compiled = self._templateProvider.compile(
							template.source, template.name
						);
						return Promise.resolve(compiled)
							.then(function (compiled) {
								var result = Object.create(template);
								result.compiledSource = compiled;
								return result;
							});
					});

					return Promise.all(compilePromises);
				})
				.then(function (templates) {
					return util.format(COMPONENT_FORMAT,
						componentName,
						util.format(
							REQUIRE_FORMAT,
							'./' +
							requireHelper.getValidPath(relativeLogicPath)
						),
						JSON.stringify(componentDetails.properties),
						escapeTemplateSource(templates[0].compiledSource),
						templates.length > 1 &&
						typeof(templates[1].compiledSource) === 'string' ?
						'\'' +
						escapeTemplateSource(templates[1].compiledSource) +
						'\'' : 'null'
					);
				});
			promises.push(promise);
		});

	return Promise.all(promises)
		.then(function (components) {
			return components.join(',');
		});
};

/**
 * Optimizes bundle source code and does not break it.
 * @param {string} source The bundle source code.
 */
BrowserBundleBuilder.prototype._optimize = function (source) {
	var ast = UglifyJS.parse(source),
		compressor = UglifyJS.Compressor({warnings: false}),
		exceptNames = this._injectionFinder.find(ast);

	// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	ast.figure_out_scope();
	ast = ast.transform(compressor);
	ast.figure_out_scope();
	ast.compute_char_frequency();
	ast.mangle_names({except: exceptNames});

	return ast.print_to_string();
};

/**
 * Escapes template source for including to bootstrapper.
 * @param {String} source Template compiled source.
 * @returns {String} escaped string.
 */
function escapeTemplateSource(source) {
	return source
		.replace(/(\\.)/g, '\\$&')
		.replace(/'/g, '\\\'')
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t');
}

/**
 * Removes file.
 * @param {string} filename Filename to remove.
 * @returns {Promise} Promise for nothing.
 */
function remove(filename) {
	return new Promise(function (fulfill, reject) {
		rimraf(filename, function (error) {
			if (error) {
				reject(error);
				return;
			}
			fulfill();
		});
	});
}

/**
 * Creates directory.
 * @param {string} dirpath Directory path.
 * @returns {Promise} Promise for nothing.
 */
function createDir(dirpath) {
	return new Promise(function (fulfill, reject) {
		mkdirp(dirpath, function (error) {
			if (error) {
				reject(error);
				return;
			}
			fulfill();
		});
	});
}

/**
 * Copies files from source to destination.
 * @param {string} source Path to source.
 * @param {string} destination Path to destination.
 * @returns {Promise} Promise for nothing.
 */
function copy(source, destination) {
	return new Promise(function (fulfill, reject) {
		ncp(source, destination,
			function (error) {
				if (error) {
					reject(error);
					return;
				}
				fulfill();
			});
	});
}