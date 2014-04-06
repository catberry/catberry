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

module.exports = ResourceBuilder;

var LogPassThrough = require('./streams/LogPassThrough'),
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	events = require('events'),
	path = require('path'),
	util = require('util'),
	fs = require('fs'),
	gulp = require('gulp'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	imagemin = require('gulp-imagemin'),
	minifyCSS = require('gulp-minify-css'),
	dust = require('gulp-dust'),
	clean = require('gulp-clean'),
	es = require('event-stream');

var DIRECTORY_NAMES = {
	TEMPORARY: '_tmp',
	CATBERRY_MODULES: 'catberry_modules',
	COMPILED: 'compiled',
	PLACEHOLDERS: 'placeholders',
	PUBLIC: 'public',
	ASSETS: 'assets'
};

var STYLE_FILENAME = 'style.css',
	TEMPLATE_EXTENSION = '.dust',
	SCRIPT_EXTENSION = '.js',
	INFO_COMPILED_CLEAN = 'Cleaning compiled placeholders: %s',
	INFO_PUBLIC_CLEAN = 'Cleaning public folder: %s',
	INFO_TEMPORARY_CLEAN = 'Cleaning temporary folder: %s',
	INFO_COMPILE_PLACEHOLDERS = 'Compiling placeholders of module %s',
	INFO_PROCESSING_STYLE = 'Processing styles of module %s',
	INFO_PUBLISH_SCRIPTS = 'Publishing scripts of module %s',
	INFO_PUBLISH_HTML = 'Publishing static HTML files of module %s',
	INFO_JOIN_STYLES = 'Publishing joined style to %s',
	INFO_REGISTER_WATCH = 'Registering watch on all templates and assets',
	INFO_PUBLISH_IMAGES = 'Publishing %s images of module %s';

var PATHS = {
	HTML: path.join('**', '*.html'),
	STYLES: path.join('**', '*.css'),
	SCRIPTS: path.join('**', '*.js'),
	IMAGES_PNG: path.join('**', '*.png'),
	IMAGES_JPG: path.join('**', '*.jpg'),
	IMAGES_GIF: path.join('**', '*.gif'),
	ASSETS: path.join('**', '*.*'),
	ALL: '*',
	TEMPLATES: '*' + TEMPLATE_EXTENSION
};

var TASKS = {
	CLEAN_COMPILED_PLACEHOLDERS: 'Clean compiled placeholders',
	CLEAN_PUBLIC: 'Clean public folder',
	CLEAN_TEMPORARY: 'Clean temporary folder',
	REMOVE_TEMPORARY: 'Remove temporary directory',
	COMPILE_TEMPLATES: 'Compile all templates',
	BUILD: 'Build',
	CLEAN: 'Clean',
	PROCESS_STYLES: 'Process all module styles',
	PUBLISH_JOINED_STYLES: 'Join all styles and publish',
	PUBLISH_IMAGES: 'Publish all images',
	PUBLISH_SCRIPTS: 'Publish all client-side scripts',
	PUBLISH_HTML: 'Publish all static HTML',
	BUILD_CLIENT_BUNDLE: 'Build client-side part of catberry',
	REGISTER_TEMPLATES: 'Register all templates',
	REGISTER_WATCH: 'Register watch on all templates and assets'
};

util.inherits(ResourceBuilder, events.EventEmitter);

/**
 * Creates new instance of resource builder.
 * @param {ModuleLoader} $moduleLoader Module loader to register tasks.
 * @param {Logger} $logger Logger to log status of tasks.
 * @param {TemplateProvider} $templateProvider Template provider
 * to compile templates.
 * @param {ClientBundleBuilder} $clientBundleBuilder Bundle builder.
 * @param {Object} $config Application config object.
 * @constructor
 * @extends EventEmitter
 */
function ResourceBuilder($moduleLoader, $logger, $templateProvider,
	$clientBundleBuilder, $config) {
	events.EventEmitter.call(this);

	this._isRelease = Boolean($config.isRelease);
	this._logger = $logger;
	this._templateProvider = $templateProvider;
	this._publicPath = $config.publicPath ||
		path.join(process.cwd(), DIRECTORY_NAMES.PUBLIC);
	this._clientBundleBuilder = $clientBundleBuilder;
	this._moduleLoader = $moduleLoader;

	this._registerCleanTasks();
	this._registerBuildTasks();
}

/**
 * Current public path.
 * @type {string}
 * @private
 */
ResourceBuilder.prototype._publicPath = '';

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ResourceBuilder.prototype._templateProvider = null;

/**
 * Current module loader.
 * @type {ModuleLoader}
 * @private
 */
ResourceBuilder.prototype._moduleLoader = null;

/**
 * Builds all client-side resources in public folder and compile templates.
 */
ResourceBuilder.prototype.buildResources = function () {
	gulp.start(TASKS.BUILD);
};

/**
 * Cleans all built resources.
 */
ResourceBuilder.prototype.clean = function () {
	gulp.start(TASKS.CLEAN);
};

/**
 * Registers all gulp clean tasks.
 * @private
 */
ResourceBuilder.prototype._registerCleanTasks = function () {
	var self = this;

	// clean public folder
	gulp.task(TASKS.CLEAN_PUBLIC,
		function () {
			return self._getCleanTaskForPath(
				path.join(process.cwd(), DIRECTORY_NAMES.PUBLIC),
				INFO_PUBLIC_CLEAN);
		});
	// clean temporary folder
	gulp.task(TASKS.CLEAN_TEMPORARY,
		function () {
			return self._getCleanTaskForPath(
				path.join(process.cwd(), DIRECTORY_NAMES.TEMPORARY),
				INFO_TEMPORARY_CLEAN);
		});

	// clean all compiled placeholders from every module
	gulp.task(TASKS.CLEAN_COMPILED_PLACEHOLDERS, function () {
		var compiledPlaceholdersPath = path.join(
			process.cwd(),
			DIRECTORY_NAMES.CATBERRY_MODULES,
			PATHS.ALL,
			DIRECTORY_NAMES.PLACEHOLDERS,
			DIRECTORY_NAMES.COMPILED);

		return self._getCleanTaskForPath(compiledPlaceholdersPath,
			INFO_COMPILED_CLEAN);
	});

	gulp.task(TASKS.CLEAN, [
		TASKS.CLEAN_COMPILED_PLACEHOLDERS,
		TASKS.CLEAN_PUBLIC,
		TASKS.CLEAN_TEMPORARY
	], function () {
		self.emit('cleaned');
	});
};

/**
 * Registers all build gulp tasks.
 * @private
 */
ResourceBuilder.prototype._registerBuildTasks = function () {
	var self = this;

	// process styles when temporary directory is clean
	gulp.task(TASKS.PROCESS_STYLES, function () {
		return self._getStyleProcessingTasks();
	});
	// join all style into one file when public directory is clean
	gulp.task(TASKS.PUBLISH_JOINED_STYLES, [TASKS.PROCESS_STYLES],
		function () {
			return self._getStyleJoinTask();
		});
	// public all images when public directory is clean
	gulp.task(TASKS.PUBLISH_IMAGES, function () {
		var tasks = forAllModules(self._moduleLoader.getModulesByNames(),
			function (moduleName) {
				return self._getImagesPublishTask(moduleName);
			});
		return es.concat.apply(null, tasks);
	});

	gulp.task(TASKS.PUBLISH_SCRIPTS, function () {
		var tasks = self._getScriptsPublishTasks();
		return es.concat.apply(null, tasks);
	});

	gulp.task(TASKS.PUBLISH_HTML, function () {
		var tasks = self._getStaticHTMLPublishTasks();
		return es.concat.apply(null, tasks);
	});

	// template compiling
	gulp.task(TASKS.COMPILE_TEMPLATES, function () {
		var tasks = forAllModules(self._moduleLoader.getModulesByNames(),
			function (moduleName) {
				return self._getCompileTemplateTask(moduleName);
			});

		return es.concat.apply(null, tasks);
	});
	// build catberry client-side script when templates compiling is over
	gulp.task(TASKS.BUILD_CLIENT_BUNDLE, [TASKS.COMPILE_TEMPLATES],
		function (callback) {
			self._clientBundleBuilder.build(callback);
		});

	// remove temporary directory after style processing is over
	gulp.task(TASKS.REMOVE_TEMPORARY, [TASKS.PUBLISH_JOINED_STYLES],
		function () {
			var toRemove = path.join(process.cwd(), DIRECTORY_NAMES.TEMPORARY);
			return self._getCleanTaskForPath(toRemove, INFO_TEMPORARY_CLEAN);
		});

	gulp.task(TASKS.REGISTER_WATCH, [
		TASKS.COMPILE_TEMPLATES,
		TASKS.PUBLISH_JOINED_STYLES,
		TASKS.PUBLISH_SCRIPTS,
		TASKS.PUBLISH_IMAGES,
		TASKS.PUBLISH_HTML
	], function () {
		if (self._isRelease) {
			return;
		}
		self._registerWatch();
	});

	gulp.task(TASKS.BUILD, [
		TASKS.COMPILE_TEMPLATES,
		TASKS.PUBLISH_JOINED_STYLES,
		TASKS.PUBLISH_SCRIPTS,
		TASKS.PUBLISH_IMAGES,
		TASKS.PUBLISH_HTML,
		TASKS.BUILD_CLIENT_BUNDLE,
		TASKS.REMOVE_TEMPORARY,
		TASKS.REGISTER_WATCH
	], function () {
		self.emit('built');
	});
};

ResourceBuilder.prototype._registerWatch = function () {
	this._logger.info(INFO_REGISTER_WATCH);

	var modulesPath = path.join(
		process.cwd(),
		DIRECTORY_NAMES.CATBERRY_MODULES,
		PATHS.ALL
	);
	var templatesPath = path.join(
		modulesPath,
		DIRECTORY_NAMES.PLACEHOLDERS,
		PATHS.TEMPLATES
	);
	gulp.watch(templatesPath,
		[TASKS.COMPILE_TEMPLATES, TASKS.BUILD_CLIENT_BUNDLE]);

	var assetsPath = path.join(
		modulesPath,
		DIRECTORY_NAMES.ASSETS
	);

	var stylesPath = path.join(
		assetsPath,
		PATHS.STYLES
	);
	gulp.watch(stylesPath, [
		TASKS.PUBLISH_JOINED_STYLES,
		TASKS.REMOVE_TEMPORARY
	]);

	var imagesPathPng = path.join(
		assetsPath,
		PATHS.IMAGES_PNG
	);
	var imagesPathJpg = path.join(
		assetsPath,
		PATHS.IMAGES_JPG
	);
	var imagesPathGif = path.join(
		assetsPath,
		PATHS.IMAGES_GIF
	);
	gulp.watch([
			imagesPathPng,
			imagesPathJpg,
			imagesPathGif
		],
		[TASKS.PUBLISH_IMAGES]
	);

	var scriptsPath = path.join(
		assetsPath,
		PATHS.SCRIPTS
	);
	gulp.watch(scriptsPath, [TASKS.PUBLISH_SCRIPTS]);

	var htmlPath = path.join(
		assetsPath,
		PATHS.HTML
	);
	gulp.watch(htmlPath, [TASKS.PUBLISH_HTML]);
};

/**
 * Gets gulp clean task for specified path.
 * @param {string} folderPath Folder path.
 * @param {string} message Message when start to clean.
 * @returns {Stream} Gulp task stream.
 * @private
 */
ResourceBuilder.prototype._getCleanTaskForPath =
	function (folderPath, message) {
		var self = this,
			logStream = new LogPassThrough(function () {
				self._logger.info(util.format(message, folderPath));
			});

		return gulp.src(folderPath)
			.pipe(logStream)
			.pipe(clean());
	};

/**
 * Gets gulp task for publishing of static HTML content of all modules.
 * @returns {Array<Stream>} Array of gulp task streams.
 * @private
 */
ResourceBuilder.prototype._getStaticHTMLPublishTasks = function () {
	var self = this;
	return forAllModules(this._moduleLoader.getModulesByNames(),
		function (moduleName) {
			var sourcePath = path.join(
					process.cwd(),
					DIRECTORY_NAMES.CATBERRY_MODULES,
					moduleName,
					DIRECTORY_NAMES.ASSETS,
					PATHS.HTML
				),

				destinationPath = path.join(
					process.cwd(),
					DIRECTORY_NAMES.PUBLIC,
					moduleName
				),

				message = util.format(
					INFO_PUBLISH_HTML,
					moduleName),

				logStream = new LogPassThrough(function () {
					self._logger.info(message);
				});

			var stream = gulp.src(sourcePath)
				.pipe(logStream);

			return stream.pipe(gulp.dest(destinationPath));
		});
};

/**
 * Gets gulp task for publishing of client scripts of all modules.
 * @returns {Array<Stream>} Array of gulp task streams.
 * @private
 */
ResourceBuilder.prototype._getScriptsPublishTasks = function () {
	var self = this;
	return forAllModules(this._moduleLoader.getModulesByNames(),
		function (moduleName) {
			var sourcePath = path.join(
					process.cwd(),
					DIRECTORY_NAMES.CATBERRY_MODULES,
					moduleName,
					DIRECTORY_NAMES.ASSETS,
					PATHS.SCRIPTS
				),

				destinationPath = path.join(
					process.cwd(),
					DIRECTORY_NAMES.PUBLIC,
					moduleName
				),

				message = util.format(
					INFO_PUBLISH_SCRIPTS,
					moduleName),

				logStream = new LogPassThrough(function () {
					self._logger.info(message);
				});

			var stream = gulp.src(sourcePath)
				.pipe(logStream);

			if (self._isRelease) {
				stream = stream.pipe(uglify());
			}

			return stream.pipe(gulp.dest(destinationPath));
		});
};

/**
 * Gets gulp task for module's images processing.
 * @param {string} moduleName Name of module.
 * @returns {Stream} Gulp task stream.
 * @private
 */
ResourceBuilder.prototype._getImagesPublishTask = function (moduleName) {
	var self = this,
		tasks = [],
		sourcePathAssets = path.join(
			process.cwd(),
			DIRECTORY_NAMES.CATBERRY_MODULES,
			moduleName,
			DIRECTORY_NAMES.ASSETS),
		sourcePathPng = path.join(sourcePathAssets, PATHS.IMAGES_PNG),
		sourcePathJpg = path.join(sourcePathAssets, PATHS.IMAGES_JPG),
		sourcePathGif = path.join(sourcePathAssets, PATHS.IMAGES_GIF),
		destinationPath = path.join(
			process.cwd(),
			DIRECTORY_NAMES.PUBLIC,
			moduleName
		),

		messagePng = util.format(INFO_PUBLISH_IMAGES, '.png', moduleName),
		messageJpg = util.format(INFO_PUBLISH_IMAGES, '.jpg', moduleName),
		messageGif = util.format(INFO_PUBLISH_IMAGES, '.gif', moduleName),

		logStreamPng = new LogPassThrough(function () {
			self._logger.info(messagePng);
		}),
		logStreamJpg = new LogPassThrough(function () {
			self._logger.info(messageJpg);
		}),
		logStreamGif = new LogPassThrough(function () {
			self._logger.info(messageGif);
		});

	var pngTask = gulp.src(sourcePathPng)
		.pipe(logStreamPng);
	if (this._isRelease) {
		pngTask = pngTask.pipe(imagemin());
	}
	tasks.push(pngTask.pipe(gulp.dest(destinationPath)));

	var jpgTask = gulp.src(sourcePathJpg)
		.pipe(logStreamJpg);
	if (this._isRelease) {
		jpgTask = jpgTask.pipe(imagemin());
	}
	tasks.push(jpgTask.pipe(gulp.dest(destinationPath)));

	var gifTask = gulp.src(sourcePathGif)
		.pipe(logStreamGif);
	if (this._isRelease) {
		gifTask = gifTask.pipe(imagemin());
	}
	tasks.push(gifTask.pipe(gulp.dest(destinationPath)));

	return es.concat.apply(null, tasks);
};

/**
 * Gets gulp task for processing of all CSS styles of all modules.
 * @returns {Stream} Gulp task stream.
 * @private
 */
ResourceBuilder.prototype._getStyleProcessingTasks = function () {
	var self = this,
		tmpPath = path.join(
			process.cwd(),
			DIRECTORY_NAMES.TEMPORARY);

	var tasks = forAllModules(this._moduleLoader.getModulesByNames(),
		function (moduleName) {
			var stylesPath = path.join(
					process.cwd(),
					DIRECTORY_NAMES.CATBERRY_MODULES,
					moduleName,
					DIRECTORY_NAMES.ASSETS,
					PATHS.STYLES
				),

				message = util.format(INFO_PROCESSING_STYLE, moduleName),
				logStream = new LogPassThrough(function () {
					self._logger.info(message);
				}),
				destination = path.join(tmpPath, moduleName);

			return gulp.src(stylesPath)
				.pipe(logStream)
				.pipe(concat(STYLE_FILENAME))
				.pipe(gulp.dest(destination));
		});

	return es.concat.apply(null, tasks);
};

/**
 * Gets gulp task for joining processed CSS styles in one file.
 * @returns {Stream} Gulp task stream.
 * @private
 */
ResourceBuilder.prototype._getStyleJoinTask = function () {
	var self = this,
		stylesPath = path.join(
			process.cwd(), DIRECTORY_NAMES.TEMPORARY, PATHS.STYLES),
		destination = path.join(process.cwd(), DIRECTORY_NAMES.PUBLIC),
		logStream = new LogPassThrough(function () {
			self._logger.info(INFO_JOIN_STYLES,
				path.join(destination, STYLE_FILENAME));
		});

	var stream = gulp.src(stylesPath)
		.pipe(logStream)
		.pipe(concat(STYLE_FILENAME));

	if (this._isRelease) {
		stream = stream.pipe(minifyCSS());
	}

	return stream.pipe(gulp.dest(destination));
};

/**
 * Gets gulp task for module's templates compilation.
 * @param {string} moduleName Name of module.
 * @returns {Stream} Gulp task stream.
 * @private
 */
ResourceBuilder.prototype._getCompileTemplateTask = function (moduleName) {
	var self = this,
		sourcePlaceholdersPath = path.join(
			process.cwd(),
			DIRECTORY_NAMES.CATBERRY_MODULES,
			moduleName,
			DIRECTORY_NAMES.PLACEHOLDERS,
			PATHS.TEMPLATES
		),

		compiledPlaceholdersPath = path.join(
			process.cwd(),
			DIRECTORY_NAMES.CATBERRY_MODULES,
			moduleName,
			DIRECTORY_NAMES.PLACEHOLDERS,
			DIRECTORY_NAMES.COMPILED
		),

		message = util.format(
			INFO_COMPILE_PLACEHOLDERS,
			moduleName),

		logStream = new LogPassThrough(function () {
			self._logger.info(message);
		});

	return gulp.src(sourcePlaceholdersPath)
		.pipe(logStream)
		.pipe(dust(function (file) {
			var placeholderName = path.basename(file.path, TEMPLATE_EXTENSION);
			return moduleContextHelper.joinModuleNameAndContext(
				moduleName, placeholderName);
		}))
		.pipe(gulp.dest(compiledPlaceholdersPath))
		.on('data', function (file) {
			var placeholderName = path.basename(file.path, SCRIPT_EXTENSION),
				fullName = moduleContextHelper.joinModuleNameAndContext(
					moduleName, placeholderName);
			self._templateProvider.registerCompiled(fullName,
				file.contents.toString());
		});
};

/**
 * Maps module names to another set with map method.
 * @param {Object} modules Set of modules.
 * @param {Function} map Map function.
 * @returns {Array} Array of mapped objects.
 */
function forAllModules(modules, map) {
	return Object
		.keys(modules)
		.map(map);
}