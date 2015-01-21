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
	UglifyJS = require('uglify-js'),
	browserify = require('browserify'),
	moduleHelper = require('./helpers/moduleHelper'),
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
	TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js',
	BOOTSTRAPPER_FILENAME = 'Bootstrapper.js',
	BROWSER_SCRIPT_FILENAME = 'browser.js',
	BUNDLE_FILENAME = 'bundle.js',
	STORE_FORMAT = '{name: \'%s\', constructor: %s},\n',
	STORES_REPLACE = '/**__stores**/',
	COMPONENT_FORMAT = '{' +
		'name: \'%s\', ' +
		'constructor: %s, ' +
		'properties: %s, ' +
		'templateSource: \'%s\', ' +
		'errorTemplateSource \'%s\'' +
		'},\n',
	COMPONENTS_REPLACE = '/**__components**/',
	ROUTE_DEFINITIONS_REPLACE = '\'__routeDefinitions\'',
	ROUTE_DEFINITIONS_FILENAME = 'routes.js',
	TEMPLATE_ENGINE_REPLACE = '\'__templateEngine\'',
	REQUIRE_FORMAT = 'require(\'%s\')',
	HEADER_FORMAT = '/* %s: %s */\n',
	BRACKETS_REGEXP = /(?:^\[)|(?:\]$)/g;

/**
 * Creates new instance of browser bundle builder.
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
 * Builds browser bundle.
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
		}, function (reason) {
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
	return Promise.all([
		this._storeFinder.find(),
		this._componentFinder.find()
	])
		.then(function (found) {
			self._watchFiles();
			return fs.readFile(bootstrapperTemplatePath, {encoding: 'utf8'})
				.then(function (file) {
					return {
						file: file,
						found: found
					};
				});
		})
		.then(function (context) {
			return Promise.all([
				self._generateRequiresForStores(context.found[0]),
				self._generateRequiresForComponents(context.found[1])
			])
				.then(function (results) {
					return {
						file: context.file,
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
						// for windows
						routeDefinitionsPath.replace(/\\/g, '\\\\')) :
						'undefined';
					return context.file
						.replace(COMPONENTS_REPLACE, context.components)
						.replace(STORES_REPLACE, context.stores)
						.replace(ROUTE_DEFINITIONS_REPLACE, requireString);
				});
		})
		.then(null, function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Generates replaces for every store.
 * @param {Object} found Map of Found stores by names.
 * @returns {Promise<string>} Promise for JSON that describes components.
 * @private
 */
BrowserBundleBuilder.prototype._generateRequiresForStores = function (found) {
	var stores = [];
	Object
		.keys(found)
		.forEach(function (storeName) {
			var requireExpression = found[storeName].path ?
				util.format(
					REQUIRE_FORMAT,
					path.resolve(process.cwd(), found[storeName].path)
						.replace(/\\/g, '\\\\') // for windows
				) : 'null';
			stores.push(util.format(
				STORE_FORMAT, storeName, requireExpression
			));
		});
	return Promise.resolve('[' + stores.join(',') + ']');
};

/**
 * Generates replaces for every component.
 * @param {Object} found Found map of components by names.
 * @returns {Promise<string>} Promise for JSON that describes components.
 * @private
 */
BrowserBundleBuilder.prototype._generateRequiresForComponents =
	function (found) {
		var self = this,
			promises = [];

		Object.keys(found)
			.forEach(function (componentName) {
				var componentDetails = found[componentName],
					logicFile = found[componentName].properties.logic ||
						moduleHelper.DEFAULT_LOGIC_FILENAME,
					logicPath = path.resolve(
						path.dirname(componentDetails.path), logicFile
					),
					relativeLogicPath = path
						.relative(process.cwd(), logicPath),
					constructor;

				try {
					constructor = require(logicPath);
				} catch (e) {
					this._eventBus.emit('error', e);
				}

				if (typeof(constructor) !== 'function') {
					return;
				}

				var templatePromises = [fs.readFile(componentDetails.template)];
				if (componentDetails.errorTemplate) {
					templatePromises.push(fs.readFile(
						componentDetails.errorTemplate
					));
				}
				var promise = Promise.all(templatePromises)
					.then(function (sources) {
						var compiled = sources.map(function (source) {
							return self._templateProvider.compile(source);
						});

						return util.format(COMPONENT_FORMAT,
							componentName,
							util.format(REQUIRE_FORMAT, relativeLogicPath)
								.replace(/\\/g, '\\\\'), // for windows
							JSON.stringify(componentDetails.properties),
							compiled[0],
							compiled[1] || ''
						);
					});
				promises.push(promise);
			});

		return Promise.all(promises)
			.then(function (components) {
				return '[' + components.join(',') + ']';
			});
	};

/**
 * Optimizes bundle source code and does not break it.
 * @param {string} source Bundle source code.
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