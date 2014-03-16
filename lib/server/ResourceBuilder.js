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

var gulp = require('gulp'),using = require('gulp-using'),
	concat = require('gulp-concat'),
	uglify = require('gulp-uglify'),
	imagemin = require('gulp-imagemin'),
	minifyCSS = require('gulp-minify-css'),
	changed = require('gulp-changed'),
	dust = require('gulp-dust'),
	clean = require('gulp-clean'),
	es = require('event-stream');

var directoryNames = {
	catberryModules: 'catberry_modules',
	catberryDest: 'prepublic',
	templates: 'placeholders',
	images: 'images',
	styles: 'css',
	scripts: 'js',
	dest: 'public'
};

var paths = {
	modules: './' + directoryNames.catberryModules + '/',
	predest: './' + directoryNames.catberryModules + '/',
	dest: './' + directoryNames.dest + '/',
	_assets: '/assets/',
	_scripts: '/**/*.js',
	_images: '/**/*.png',
	_styles: '/**/*.css',
	_templates: '/**/*.dust'
};

/**
 * Creates new instance of resource builder.
 * @param {TemplateProvider} $templateProvider Template provider
 * to compile templates.
 * @param {string} publicPath Path where to public all resources.
 * @constructor
 */
function ResourceBuilder($templateProvider, publicPath) {
	this._templateProvider = $templateProvider;
	this._publicPath = publicPath;
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
 * Builds all client-side resources and templates in public folder.
 * @param {Array} modulesByNames Modules array to build resources.
 */
ResourceBuilder.prototype.buildResources = function (modulesByNames) {
	this._registerTasks(modulesByNames);
	this._buildResourcesByEnvironment();
};

/**
 * Registers Gulp tasks.
 * @param {Array} modulesByNames Modules array to build resources.
 * @private
 */
ResourceBuilder.prototype._registerTasks = function (modulesByNames) {
	gulp.task('prepublic-clean', function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.modules + folder + '/' +
					directoryNames.catberryDest + '/')
				.pipe(using())
				.pipe(clean());
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('prepublic-templates', function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.modules + folder + '/' +
					directoryNames.templates + paths._templates)
				.pipe(using())
				.pipe(gulp.dest(paths.predest +
					folder + '/' +
					directoryNames.catberryDest + '/' +
					directoryNames.templates + '/')
				);
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('clean', ['prepublic-clean'], function () {
		return gulp.src(paths.dest, {read: false})
			.pipe(using())
			.pipe(clean());
	});

	gulp.task('dev-templates', ['prepublic-templates'], function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.predest + folder + '/' +
					directoryNames.catberryDest + '/' +
					directoryNames.templates + paths._templates)
				.pipe(using())
				.pipe(dust())
				.pipe(gulp.dest(paths.dest + folder + '/' +
					directoryNames.templates + '/'));
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('dev-images', function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.modules + folder + paths._assets +
					directoryNames.images + paths._images)
				.pipe(using())
				.pipe(gulp.dest(paths.dest + folder + '/' +
					directoryNames.images + '/'));
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('dev-styles', function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.modules + folder + paths._assets +
					directoryNames.styles + paths._styles)
				.pipe(using())
				.pipe(gulp.dest(paths.dest + folder + '/' +
					directoryNames.styles + '/'));
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('dev-scripts', function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.modules + folder + paths._assets +
					directoryNames.scripts + paths._scripts)
				.pipe(using())
				.pipe(gulp.dest(paths.dest + folder + '/' +
					directoryNames.scripts + '/'));
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('dev-assets', [
		'dev-templates',
		'dev-images',
		'dev-styles',
		'dev-scripts'
	]);

	gulp.task('prod-templates', ['prepublic-templates'], function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.predest + folder + '/' +
					directoryNames.catberryDest + '/' +
					directoryNames.templates + paths._templates)
				.pipe(using())
				.pipe(dust())
				.pipe(concat('templates.min.js'))
				.pipe(gulp.dest(paths.dest +
					directoryNames.scripts + '/'));
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('prod-images', function () {
		var tasks = Object.keys(modulesByNames).map(function (folder) {
			return gulp.src(paths.modules + folder + paths._assets +
					directoryNames.images + paths._images)
				.pipe(using())
				.pipe(imagemin({optimizationLevel: 5}))
				.pipe(gulp.dest(paths.dest +
					directoryNames.images + '/' + folder + '/'));
		});

		return es.concat.apply(null, tasks);
	});

	gulp.task('prod-styles', function () {
		return gulp.src(paths.modules + '**' + paths._assets +
				directoryNames.styles + paths._styles)
			.pipe(using())
			.pipe(concat('styles.min.js'))
			.pipe(minifyCSS())
			.pipe(gulp.dest(paths.dest +
				directoryNames.styles + '/'));
	});

	gulp.task('prod-scripts', function () {
		return gulp.src(paths.modules + '**' + paths._assets +
				directoryNames.scripts + paths._scripts)
			.pipe(using())
			.pipe(concat('app.min.js'))
			.pipe(uglify())
			.pipe(gulp.dest(paths.dest +
				directoryNames.scripts + '/'));
	});

	gulp.task('prod-assets', [
		'prod-templates',
		'prod-images',
		'prod-styles',
		'prod-scripts'
	]);

};

/**
 * Builds resources depends on environment
 * @private
 */
ResourceBuilder.prototype._buildResourcesByEnvironment = function () {
	if (process.argv.length === 3 && process.argv[2] === 'release') {
		gulp.run('prod-assets');
		return;
	}
	gulp.run('dev-assets');
};