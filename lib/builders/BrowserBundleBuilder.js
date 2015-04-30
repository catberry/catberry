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
	stream = require('stream'),
	util = require('util'),
	fs = require('fs'),
	pfs = require('../promises/fs'),
	mkdirp = require('mkdirp'),
	watchify = require('watchify'),
	browserify = require('browserify'),
	moduleHelper = require('../helpers/moduleHelper'),
	UglifyTransform = require('../streams/UglifyTransform'),
	packageDescriptionString = '';

var DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public'),
	TRACE_OPTIMIZING_FILE = 'Optimizing code of file "%s"...',
	INFO_BUILDING_BUNDLE = 'Building browser script bundle...',
	INFO_WATCHING_FILES = 'Watching files for changes to rebuild bundle...',
	INFO_FILES_CHANGED = 'Bundle has been updated, changed files: [%s]',
	WARN_SKIPPING_INCORRECT_ACTION =
		'The post-build action has an incorrect interface, skipping...',
	WARN_SKIPPING_INCORRECT_TRANSFORM =
		'The browserify transformation has an incorrect interface, skipping...',
	TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js',
	BROWSER_SCRIPT_FILENAME = 'browser.js',
	BUNDLE_FILENAME = 'bundle.js',
	HEADER_FORMAT = '/*\n * %s: %s\n * Build Date: %s\n */\n\n';

try {
	var packageDescription = require(path.join(process.cwd(), 'package.json'));
	if (packageDescription &&
		packageDescription.name &&
		packageDescription.version) {
		packageDescriptionString =
			util.format(
				HEADER_FORMAT,
				packageDescription.name,
				packageDescription.version,
				(new Date()).toString()
			);
	}

} catch (e) {
	// ok, nothing to do here
}

/**
 * Creates new instance of the browser bundle builder.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 */
function BrowserBundleBuilder($serviceLocator) {
	var config = $serviceLocator.resolve('config');
	this._isRelease = Boolean(config.isRelease);

	this._serviceLocator = $serviceLocator;
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._logger = $serviceLocator.resolve('logger');
	this._bootstrapperBuilder = $serviceLocator.resolve('bootstrapperBuilder');
	this._componentFinder = $serviceLocator.resolve('componentFinder');
	this._storeFinder = $serviceLocator.resolve('storeFinder');

	this._publicPath = config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
	this._bootstrapperPath = path.join(
		process.cwd(), TEMPORARY_BOOTSTRAPPER_FILENAME
	);
	this._entryPath = path.join(process.cwd(), BROWSER_SCRIPT_FILENAME);
	this._bundlePath = path.join(
		this._publicPath, (config.bundleFilename || BUNDLE_FILENAME)
	);
	this._postBuildActions = this._serviceLocator
		.resolveAll('postBuildAction');
	this._browserifyTransformations = this._serviceLocator
		.resolveAll('browserifyTransformation');
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
BrowserBundleBuilder.prototype._serviceLocator = null;

/**
 * Current bootstrapper builder.
 * @type {BootstrapperBuilder}
 * @private
 */
BrowserBundleBuilder.prototype._bootstrapperBuilder = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
BrowserBundleBuilder.prototype._eventBus = null;

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
 * Current path to the __BrowserBundle.js.
 * @type {string}
 * @private
 */
BrowserBundleBuilder.prototype._bootstrapperPath = '';

/**
 * Current path to the browser.js.
 * @type {string}
 * @private
 */
BrowserBundleBuilder.prototype._entryPath = '';

/**
 * Current path to the bundle.js.
 * @type {string}
 * @private
 */
BrowserBundleBuilder.prototype._bundlePath = '';

/**
 * Current Browserify bundler.
 * @type {Browserify}
 * @private
 */
BrowserBundleBuilder.prototype._bundler = null;

/**
 * Current bootstrapper cache.
 * @type {string}
 * @private
 */
BrowserBundleBuilder.prototype._bootstrapperCache = '';

/**
 * Current post build actions list.
 * @type {Array}
 * @private
 */
BrowserBundleBuilder.prototype._postBuildActions = null;

/**
 * Current browserify transformations list.
 * @type {Array}
 * @private
 */
BrowserBundleBuilder.prototype._browserifyTransformations = null;

/**
 * Builds the browser bundle.
 * @returns {Promise} Promise for nothing.
 */
BrowserBundleBuilder.prototype.build = function () {
	var self = this;

	return pfs.exists(this._publicPath)
		.then(function (isExists) {
			return !isExists ? makeDirectory(self._publicPath) : null;
		})
		.then(function () {
			return self._createBootstrapper();
		})
		.then(function () {
			return new Promise(function (fulfill, reject) {
				self._createBundler()
					.once('error', reject)
					.once('bundle', function (bundleStream) {
						bundleStream.once('end', fulfill);
					})
					.bundle();
			});
		})
		.then(function () {
			return self._doPostBuildActions();
		})
		.then(function () {
			return self._isRelease ?
				pfs.unlink(self._bootstrapperPath) :
				self._watch();
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Creates bootstrapper file for bundler.
 * @returns {Promise} Promise for nothing.
 * @private
 */
BrowserBundleBuilder.prototype._createBootstrapper = function () {
	var self = this;
	return Promise.all([
		this._storeFinder.find(),
		this._componentFinder.find()
	])
		.then(function (found) {
			return self._bootstrapperBuilder.build(found[0], found[1]);
		})
		.then(function (realBootstrapper) {
			if (realBootstrapper === self._bootstrapperCache) {
				return;
			}
			self._bootstrapperCache = realBootstrapper;
			return pfs.writeFile(self._bootstrapperPath, realBootstrapper);
		});
};

/**
 * Creates browserify bundler or re-uses existed one.
 * @returns {Browserify}
 * @private
 */
BrowserBundleBuilder.prototype._createBundler = function () {
	if (this._bundler) {
		return this._bundler;
	}
	var self = this;

	this._bundler = browserify({
		cache: {},
		packageCache: {},
		debug: !this._isRelease
	});
	this._bundler.add(this._entryPath);

	if (!self._isRelease) {
		this._bundler = watchify(this._bundler);
		this._logger.info(INFO_WATCHING_FILES);
	} else {
		this._bundler.transform(function (file) {
			if (path.extname(file) !== '.js') {
				return new stream.PassThrough();
			}
			self._logger.trace(util.format(
				TRACE_OPTIMIZING_FILE, file
			));
			return new UglifyTransform(self._serviceLocator);
		}, {global: true});
	}

	var currentIndex = this._browserifyTransformations.length - 1,
		currentTransformation;
	while(currentIndex >= 0) {
		currentTransformation = this._browserifyTransformations[currentIndex];
		currentIndex--;
		if (!currentTransformation ||
			typeof(currentTransformation) !== 'object' ||
			typeof(currentTransformation.transform) !== 'function') {
			this._logger.warn(WARN_SKIPPING_INCORRECT_TRANSFORM);
			continue;
		}
		this._bundler.transform(
			currentTransformation.transform, currentTransformation.options
		);
	}

	var startTime = 0,
		resetHandler = function () {
			self._logger.info(INFO_BUILDING_BUNDLE);
			startTime = Date.now();
		};

	this._bundler
		.on('update', function (ids) {
			self._logger.info(util.format(
				INFO_FILES_CHANGED,
				ids.join(',')
			));
			self._bundler.bundle();
		})
		.on('error', function (error) {
			self._eventBus.emit('error', error);
		})
		.on('reset', resetHandler)
		.on('bundle', function (sourceStream) {
			var outputStream = fs.createWriteStream(self._bundlePath);
			outputStream.write(packageDescriptionString);
			outputStream.once('finish', function () {
				self._eventBus.emit('bundleBuilt', {
					path: self._bundlePath,
					time: Date.now() - startTime
				});
			});
			sourceStream.pipe(outputStream);
		});

	resetHandler(); // to set startTime universally.
	return this._bundler;
};

/**
 * Do all registered post build actions.
 * @param {number?} index Current action index.
 * @private
 * @returns {Promise} Promise for nothing.
 */
BrowserBundleBuilder.prototype._doPostBuildActions = function (index) {
	if (index === undefined) {
		// we start from the end because the list a stack
		index = this._postBuildActions.length - 1;
	}
	if (index < 0) {
		return Promise.resolve();
	}

	var self = this;
	return Promise.resolve()
		.then(function () {
			var actionObject = self._postBuildActions[index];
			if (!actionObject ||
				typeof(actionObject) !== 'object' ||
				typeof(actionObject.action) !== 'function') {
				self._logger.warn(WARN_SKIPPING_INCORRECT_ACTION);
				return;
			}

			return actionObject.action(
				self._storeFinder, self._componentFinder
			);
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			return self._doPostBuildActions(index - 1);
		});
};

/**
 * Watches file changes.
 * @private
 */
BrowserBundleBuilder.prototype._watch = function () {
	var watchHandler = this._createBootstrapper.bind(this);
	this._componentFinder.watch();
	this._componentFinder
		.on('add', watchHandler)
		.on('unlink', watchHandler)
		.on('changeTemplates', watchHandler);

	this._storeFinder.watch();
	this._storeFinder
		.on('add', watchHandler)
		.on('unlink', watchHandler);
};

/**
 * Creates all required directories for path.
 * @param {string} dirPath Directory path.
 * @returns {Promise} Promise for nothing.
 */
function makeDirectory(dirPath) {
	return new Promise(function (fulfill, reject) {
		mkdirp(dirPath, function (error) {
			if (error) {
				reject(error);
				return;
			}

			fulfill();
		});
	});
}