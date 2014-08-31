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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ClientBundleBuilder;

var path = require('path'),
	util = require('util'),
	fs = require('./denodeified/fs'),
	UglifyJS = require('uglify-js'),
	browserify = require('browserify'),
	SourceFilterTransform = require('./streams/SourceFilterTransform'),
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	packageDescriptionPath = path.join(process.cwd(), 'package.json'),
	packageDescription;

try {
	packageDescription = require(packageDescriptionPath);
} catch (e) {
	// ok, nothing to do here
}

var DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public'),
	CLIENT_ROOT_PATH = path.join(__dirname, '..', 'client'),
	CLIENT_TEMPLATE_ENGINE_PATH = path.relative(
		path.join(__dirname, '..', 'client'),
		path.join(require.resolve('dustjs-linkedin'),
			'..', '..', 'dist', 'dust-core.js'))
		.replace(/\\/g, '\\\\'), // for windows,
	INFO_BUILDING_BUNDLE = 'Building browser script bundle',
	INFO_OPTIMIZING_CLIENT_BUNDLE = 'Optimizing code of browser bundle',
	INFO_WATCHING_FILES = 'Watching files for changes to rebuild bundle',
	INFO_FILES_CHANGED = 'Files were changed, rebuilding browser bundle',
	TEMPORARY_BOOTSTRAPPER_FILENAME = '__bundle_entry.js',
	BOOTSTRAPPER_FILENAME = 'Bootstrapper.js',
	CLIENT_SCRIPT_FILENAME = 'client.js',
	BUNDLE_FILENAME = 'catberry.js',
	MODULE_FORMAT = '{name: \'%s\', implementation: %s},\n',
	MODULES_REPLACE = '/**__modules**/',
	PLACEHOLDERS_REPLACE = '/**__placeholders**/',
	ROUTE_DEFINITIONS_REPLACE = '\'__routeDefinitions\'',
	EVENT_DEFINITIONS_REPLACE = '\'__eventDefinitions\'',
	ROUTE_DEFINITIONS_FILENAME = 'routes.js',
	EVENT_DEFINITIONS_FILENAME = 'events.js',
	TEMPLATE_ENGINE_REPLACE = '\'__templateEngine\'',
	REQUIRE_FORMAT = 'require(\'%s\')',
	HEADER_FORMAT = '/* %s: %s */\n',
	CONSTRUCTOR_REGEXP = /(function)\s+([A-Z][\$\w]*)\s*\([\$\w\s,]+\)/g,
	ARGUMENTS_REGEXP = /\(\s*[\$\w]+\s*(,\s*[\$\w]+\s*)*\)/,
	PARENTHESES_REGEXP = /\(|\)/g,
	BRACKETS_REGEXP = /(^\[)|(\]$)/g;

/**
 * Creates new instance of client bundle builder.
 * @param {Object} $config Application config object.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @param {Logger} $logger Logger ot log messages.
 * @param {TemplateProvider} $templateProvider Template provider to get
 * @param {ModuleFinder} $moduleFinder Module finder to get modules paths.
 * @constructor
 */
function ClientBundleBuilder($config, $eventBus, $logger, $templateProvider,
	$moduleFinder) {
	this._eventBus = $eventBus;
	this._logger = $logger;
	this._publicPath = $config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
	this._templateProvider = $templateProvider;

	this._moduleFinder = $moduleFinder;
	this._isRelease = Boolean($config.isRelease);

	var self = this;
	if (!this._isRelease) {
		this._logger.info(INFO_WATCHING_FILES);
		this._moduleFinder.watch(function () {
			if (!self._isBuilt) {
				return;
			}
			self._logger.info(INFO_FILES_CHANGED);
			self.build();
		});
	}
}

/**
 * Determines if package was build at least one time.
 * @type {boolean}
 * @private
 */
ClientBundleBuilder.prototype._isBuilt = false;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ClientBundleBuilder.prototype._templateProvider = null;

/**
 * Current module finder.
 * @type {ModuleFinder}
 * @private
 */
ClientBundleBuilder.prototype._moduleFinder = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
ClientBundleBuilder.prototype._eventBus = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ClientBundleBuilder.prototype._logger = null;

/**
 * Is current application mode release.
 * @type {boolean}
 * @private
 */
ClientBundleBuilder.prototype._isRelease = false;

/**
 * Current path where to publish bundle.
 * @type {string}
 * @private
 */
ClientBundleBuilder.prototype._publicPath = '';

/**
 * Builds client bundle.
 * @returns {Promise} Promise for no value.
 */
ClientBundleBuilder.prototype.build = function () {
	var self = this;

	this._logger.info(INFO_BUILDING_BUNDLE);

	var bootstrapperPath = path.join(CLIENT_ROOT_PATH,
			TEMPORARY_BOOTSTRAPPER_FILENAME),
		entryPath = path.join(process.cwd(), CLIENT_SCRIPT_FILENAME),
		bundlePath = path.join(this._publicPath, BUNDLE_FILENAME),
		bundler = browserify({
			basedir: CLIENT_ROOT_PATH
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
			bundler.require(bootstrapperPath.replace(/\\/g, '\\\\'), {
				expose: 'catberry'
			});
			bundler.require(CLIENT_TEMPLATE_ENGINE_PATH, {
				expose: 'dustjs-linkedin'
			});
			return fs.exists(entryPath);
		})
		.then(function (isExists) {
			// if user defined client-side entry script then add it
			return isExists ? bundler.add(entryPath) : null;
		})
		.then(function () {
			// filter server-side modules marked with
			// /**no-client-bundle**/ hint
			bundler.transform({global: true}, function () {
				return new SourceFilterTransform();
			});

			return new Promise(function (fulfill, reject) {
				bundler.bundle(function (error, buffer) {
					if (error) {
						reject(error);
						return;
					}
					fulfill(buffer);
				});
			});
		})
		.then(function (source) {
			var finalSource = source;
			if (self._isRelease) {
				self._logger.info(INFO_OPTIMIZING_CLIENT_BUNDLE);
				finalSource = self._optimize(source);
			}

			if (packageDescription &&
				packageDescription.name &&
				packageDescription.version) {
				finalSource = util.format(HEADER_FORMAT,
					packageDescription.name,
					packageDescription.version
				) + finalSource;
			}
			return fs.writeFile(bundlePath, finalSource);
		}).then(function () {
			return fs.unlink(bootstrapperPath);
		}).then(function () {
			self._eventBus.emit('bundleBuilt', bundlePath);
			self._isBuilt = true;
		}, function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Creates real bootstrapper code for bundle build.
 * @returns {Promise} Promise for source code of real bootstrapper.
 * @private
 */
ClientBundleBuilder.prototype._createRealBootstrapper = function () {
	var self = this,
		bootstrapperTemplatePath = path.join(
			CLIENT_ROOT_PATH,
			BOOTSTRAPPER_FILENAME
		),
		templateEngine = util.format(
			REQUIRE_FORMAT,
			CLIENT_TEMPLATE_ENGINE_PATH),
		routeDefinitionsPath = path.join(process.cwd(),
			ROUTE_DEFINITIONS_FILENAME),
		eventDefinitionsPath = path.join(process.cwd(),
			EVENT_DEFINITIONS_FILENAME),
		routeDefinitionsPathRelative = path.relative(
			path.dirname(bootstrapperTemplatePath),
			routeDefinitionsPath),
		eventDefinitionsPathRelative = path.relative(
			path.dirname(bootstrapperTemplatePath),
			eventDefinitionsPath);

	return this._moduleFinder.find()
		.then(function (found) {
			return fs.readFile(bootstrapperTemplatePath, {encoding: 'utf8'})
				.then(function (file) {
					return Promise.resolve({
						file: file,
						found: found
					});
				});
		}).then(function (context) {
			return Promise.all([
					self._generateRequiresForModules(context.found),
					self._generatePlaceholders(context.found)
				]
			).then(function (results) {
					return {
						file: context.file,
						modules: results[0],
						placeholders: results[1]
					};
				});
		}).then(function (context) {
			// check if paths exist and create require statements or undefined
			return Promise.all([
				fs.exists(routeDefinitionsPath)
					.then(function (isExists) {
						return isExists ? util.format(
							REQUIRE_FORMAT,
							// for windows
							routeDefinitionsPathRelative
								.replace(/\\/g, '\\\\')) :
							'undefined';
					}),
				fs.exists(eventDefinitionsPath)
					.then(function (isExists) {
						return isExists ?
							util.format(REQUIRE_FORMAT,
								// for windows
								eventDefinitionsPathRelative.replace(/\\/g,
									'\\\\')) :
							'undefined';
					})
			]).then(function (requires) {
				return context.file
					.replace(PLACEHOLDERS_REPLACE, context.placeholders)
					.replace(MODULES_REPLACE, context.modules)
					.replace(TEMPLATE_ENGINE_REPLACE, templateEngine)
					.replace(ROUTE_DEFINITIONS_REPLACE, requires[0])
					.replace(EVENT_DEFINITIONS_REPLACE, requires[1]);
			});
		}, function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Generates replaces for every module.
 * @param {Object} found Found paths of modules.
 * @returns {string} Replace string for list of modules.
 * @private
 */
ClientBundleBuilder.prototype._generateRequiresForModules = function (found) {
	var modules = '';
	Object
		.keys(found)
		.forEach(function (moduleName) {
			var requireExpression = found[moduleName].indexPath ?
				util.format(REQUIRE_FORMAT,
					path.relative(CLIENT_ROOT_PATH, found[moduleName].indexPath)
						.replace(/\\/g, '\\\\')) : // for windows)
				'null';
			modules += util.format(
				MODULE_FORMAT, moduleName, requireExpression);
		});
	return modules.replace(/(,\n)$/, '');
};

/**
 * Generates replaces for every placeholder.
 * @param {Object} found Found paths of modules and placeholders.
 * @returns {Promise} Promise for JSON that describes placeholders.
 * @private
 */
ClientBundleBuilder.prototype._generatePlaceholders = function (found) {
	var self = this,
		promises = [];
	Object.keys(found)
		.forEach(function (moduleName) {
			var placeholders = found[moduleName].placeholders;
			Object.keys(placeholders)
				.map(function (placeholderName) {
					var fullName = moduleContextHelper
						.joinModuleNameAndContext(moduleName,
						placeholderName);
					// we do not need root templates at client-side
					if (moduleContextHelper
						.isRootPlaceholder(placeholderName)) {
						return;
					}

					var promise = fs.readFile(placeholders[placeholderName],
						{encoding: 'utf8'})
						.then(function (source) {
							return {
								moduleName: moduleName,
								name: placeholderName,
								compiledSource: self._templateProvider
									.compile(source, fullName)
							};
						});
					promises.push(promise);
				});
		});

	return Promise.all(promises)
		.then(function (results) {
			return JSON
				.stringify(results)
				.replace(BRACKETS_REGEXP, '');
		});
};

/*jshint camelcase:false */
/**
 * Optimizes bundle source code and does not break it.
 * @param {string} source Bundle source code.
 */
ClientBundleBuilder.prototype._optimize = function (source) {
	var ast = UglifyJS.parse(source),
		compressor = UglifyJS.Compressor({warnings: false}),
		exceptNames = findConstructorParameters(source);

	ast.figure_out_scope();
	ast = ast.transform(compressor);
	ast.figure_out_scope();
	ast.compute_char_frequency();
	ast.mangle_names({except: exceptNames});

	return ast.print_to_string();
};

/**
 * Finds all parameters of all constructors in source code.
 * @param {string} source Source code.
 * @returns {Array<string>} All parameter names.
 */
function findConstructorParameters(source) {
	var result = {},
		constructors = source.match(CONSTRUCTOR_REGEXP) || [];

	if (constructors === null ||
		constructors.length === 0) {
		return [];
	}

	constructors.forEach(function (constructor) {
		var constructorArguments = constructor.match(ARGUMENTS_REGEXP);

		if (constructorArguments === null ||
			constructorArguments.length === 0) {
			return;
		}

		constructorArguments[0]
			.replace(PARENTHESES_REGEXP, '')
			.split(',')
			.forEach(function (argumentName) {
				if (!argumentName) {
					return;
				}
				var trimmed = argumentName.trim();
				if (trimmed.length === 0) {
					return;
				}
				result[trimmed] = true;
			});
	});

	return Object.keys(result);
}