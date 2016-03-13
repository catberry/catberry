'use strict';

const path = require('path');
const stream = require('stream');
const fs = require('fs');
const pfs = require('../promises/fs');
const mkdirp = require('mkdirp');
const watchify = require('watchify');
const babelify = require('babelify');
const babelifyPreset = require('babel-preset-es2015');
const browserify = require('browserify');
const hrTimeHelper = require('../helpers/hrTimeHelper');
const UglifyTransform = require('../streams/UglifyTransform');

const DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public');
const TEMPORARY_BOOTSTRAPPER_FILENAME = '__BrowserBundle.js';
const BROWSER_SCRIPT_FILENAME = 'browser.js';
const BUNDLE_FILENAME = 'bundle.js';

var packageDescriptionString = '';

try {
	const packageDescription = require(path.join(process.cwd(), 'package.json'));
	if (packageDescription &&
		packageDescription.name &&
		packageDescription.version) {
		packageDescriptionString = `
/**
 * ${packageDescription.name}: ${packageDescription.version}
 * Build Date: ${(new Date()).toString()}
 */

`;
	}
} catch (e) {
	// ok, nothing to do here
}

/**
 * Implements the bundle builder module.
 */
class BrowserBundleBuilder {

	/**
	 * Creates a new instance of the browser bundle builder.
	 * @param {ServiceLocator} locator Service locator for resolving dependencies.
	 */
	constructor(locator) {
		const config = locator.resolve('config');

		/**
		 * Is current application mode release.
		 * @type {boolean}
		 * @private
		 */
		this._isRelease = Boolean(config.isRelease);

		/**
		 * Current path where to publish bundle.
		 * @type {string}
		 * @private
		 */
		this._publicPath = config.publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;

		/**
		 * Current path to the bundle.js.
		 * @type {string}
		 * @private
		 */
		this._bundlePath = path.join(this._publicPath, (config.bundleFilename || BUNDLE_FILENAME));

		/**
		 * Current path to the __BrowserBundle.js.
		 * @type {string}
		 * @private
		 */
		this._bootstrapperPath = path.join(process.cwd(), TEMPORARY_BOOTSTRAPPER_FILENAME);

		/**
		 * Current path to the browser.js.
		 * @type {string}
		 * @private
		 */
		this._entryPath = path.join(process.cwd(), BROWSER_SCRIPT_FILENAME);

		/**
		 * Current service locator.
		 * @type {ServiceLocator}
		 * @private
		 */
		this._serviceLocator = locator;

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current bootstrapper builder.
		 * @type {BootstrapperBuilder}
		 * @private
		 */
		this._bootstrapperBuilder = locator.resolve('bootstrapperBuilder');

		/**
		 * Current component finder.
		 * @type {ComponentFinder}
		 * @private
		 */
		this._componentFinder = locator.resolve('componentFinder');

		/**
		 * Current store finder.
		 * @type {StoreFinder}
		 * @private
		 */
		this._storeFinder = locator.resolve('storeFinder');

		/**
		 * Current post build actions list.
		 * @type {Array}
		 * @private
		 */
		this._postBuildActions = [];
		try {
			this._postBuildActions = locator.resolveAll('postBuildAction');
		} catch (e) {
			// nothing to do here
		}

		/**
		 * Current browserify transformations list.
		 * @type {Array}
		 * @private
		 */
		this._browserifyTransformations = [];
		try {
			this._browserifyTransformations = locator.resolveAll('browserifyTransformation');
		} catch (e) {
			// nothing to do here
		}

		/**
		 * Current browserify plugins list.
		 * @type {Array}
		 * @private
		 */
		this._browserifyPlugins = [];
		try {
			this._browserifyPlugins = locator.resolveAll('browserifyPlugin');
		} catch (e) {
			// nothing to do here
		}

		/**
		 * Current Browserify bundler.
		 * @type {Browserify}
		 * @private
		 */
		this._bundler = null;

		/**
		 * Current bootstrapper cache.
		 * @type {string}
		 * @private
		 */
		this._bootstrapperCache = '';
	}

	/**
	 * Builds the browser bundle.
	 * @returns {Promise} The promise for finished work.
	 */
	build() {
		return pfs.exists(this._publicPath)
			.then(isExists => !isExists ? makeDirectory(this._publicPath) : null)
			.then(() => this._createBootstrapper())
			.then(() => new Promise((fulfill, reject) => this._createBundler()
					.once('error', reject)
					.once('bundle', bundleStream => bundleStream
							.once('end', fulfill)
							.on('error', reject)
					)
					.bundle()
				)
			)
			.then(() => this._doPostBuildActions())
			.then(() => this._isRelease ?
					pfs.unlink(this._bootstrapperPath) :
					this._watch()
			)
			.catch(reason => this._eventBus.emit('error', reason));
	}

	/**
	 * Creates a bootstrapper file for the bundler.
	 * @returns {Promise} The promise for finished work.
	 * @private
	 */
	_createBootstrapper() {
		return Promise.all([
			this._storeFinder.find(),
			this._componentFinder.find()
		])
			.then(found => this._bootstrapperBuilder.build(found[0], found[1]))
			.then(realBootstrapper => {
				if (realBootstrapper === this._bootstrapperCache) {
					return null;
				}
				this._bootstrapperCache = realBootstrapper;
				return pfs.writeFile(this._bootstrapperPath, realBootstrapper);
			});
	}

	/**
	 * Creates the browserify bundler or re-uses the existing one.
	 * @returns {Browserify} The browserify instance.
	 * @private
	 */
	_createBundler() {
		if (this._bundler) {
			return this._bundler;
		}

		this._bundler = browserify({
			cache: {},
			packageCache: {},
			debug: !this._isRelease
		})
			.add(this._entryPath)
			.transform(babelify, {
				global: true,
				presets: [babelifyPreset]
			});

		if (!this._isRelease) {
			this._bundler = watchify(this._bundler);
			this._eventBus.emit('info', 'Watching files for changes to rebuild the bundle...');
		} else {
			this._bundler.transform(file => {
				if (path.extname(file) !== '.js') {
					return new stream.PassThrough();
				}
				this._eventBus.emit('trace', `Minifying code of the file "${file}"...`);
				return new UglifyTransform();
			}, {
				global: true
			});
		}

		this._setTransformations();
		this._setPlugins();

		var startTime;
		const resetHandler = () => {
			this._eventBus.emit('info', `Building browser script bundle at "${this._bundlePath}"...`);
			startTime = hrTimeHelper.get();
		};

		this._bundler
			.on('update', ids => {
				this._eventBus.emit('bundleChanged', {
					path: this._bundlePath,
					changedFiles: ids
				});

				this._bundler.bundle();
			})
			.on('error', error => this._eventBus.emit('error', error))
			.on('reset', resetHandler)
			.on('bundle', sourceStream => {
				const outputStream = fs.createWriteStream(this._bundlePath);
				outputStream.write(packageDescriptionString);
				outputStream.once('finish', () => {
					const hrTime = hrTimeHelper.get(startTime);
					this._eventBus.emit('bundleBuilt', {
						path: this._bundlePath,
						hrTime,
						time: hrTimeHelper.toMilliseconds(hrTime)
					});
				});
				sourceStream.pipe(outputStream);
			});

		resetHandler(); // to set startTime universally.
		return this._bundler;
	}

	/**
	 * Does all the registered post build actions.
	 * @param {number?} index Current action index for recursive calls.
	 * @private
	 * @returns {Promise} The promise for finished work.
	 */
	_doPostBuildActions(index) {
		if (index === undefined) {
			// we start from the end because the list a stack
			index = this._postBuildActions.length - 1;
		}
		if (index < 0) {
			return Promise.resolve();
		}

		return Promise.resolve()
			.then(() => {
				const actionObject = this._postBuildActions[index];
				if (!actionObject ||
					typeof (actionObject) !== 'object' ||
					typeof (actionObject.action) !== 'function') {
					this._eventBus.emit('warn', 'The post-build action has an incorrect interface, skipping...');
					return null;
				}

				return actionObject.action(this._storeFinder, this._componentFinder);
			})
			.catch(reason => this._eventBus.emit('error', reason))
			.then(() => this._doPostBuildActions(index - 1));
	}

	/**
	 * Watches the file's changes.
	 * @private
	 */
	_watch() {
		const watchHandler = this._createBootstrapper.bind(this);
		this._componentFinder.watch();
		this._componentFinder
			.on('add', watchHandler)
			.on('unlink', watchHandler)
			.on('changeTemplates', watchHandler);

		this._storeFinder.watch();
		this._storeFinder
			.on('add', watchHandler)
			.on('unlink', watchHandler);
	}

	/**
	 * Sets the list of current transformations to the bundler.
	 */
	_setTransformations() {
		// traverse items in the reversed order
		var currentIndex = this._browserifyTransformations.length - 1;

		while (currentIndex >= 0) {
			const currentTransformation = this._browserifyTransformations[currentIndex];
			currentIndex--;
			if (!currentTransformation ||
				typeof (currentTransformation) !== 'object' ||
				typeof (currentTransformation.transform) !== 'function') {
				this._eventBus.emit('warn', 'The browserify transformation has an incorrect interface, skipping...');
				continue;
			}
			this._bundler.transform(
				currentTransformation.transform, currentTransformation.options
			);
		}
	}

	/**
	 * Sets the list of current plugins to the bundler.
	 */
	_setPlugins() {
		var currentIndex = this._browserifyPlugins.length - 1;

		while (currentIndex >= 0) {
			const currentPlugin = this._browserifyPlugins[currentIndex];
			currentIndex--;
			if (!currentPlugin ||
				typeof (currentPlugin) !== 'object' ||
				typeof (currentPlugin.plugin) !== 'function') {
				this._eventBus.emit('warn', 'The browserify plugin has an incorrect interface, skipping...');
				continue;
			}
			this._bundler.plugin(
				currentPlugin.plugin, currentPlugin.options
			);
		}
	}
}

/**
 * Creates all necessary directories for path.
 * @param {string} dirPath Directory path.
 * @returns {Promise} Promise for nothing.
 */
function makeDirectory(dirPath) {
	return new Promise((fulfill, reject) => {
		mkdirp(dirPath, error => {
			if (error) {
				reject(error);
				return;
			}

			fulfill();
		});
	});
}

module.exports = BrowserBundleBuilder;
