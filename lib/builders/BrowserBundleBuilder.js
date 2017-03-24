'use strict';

const path = require('path');
const stream = require('stream');
const fs = require('fs');
const pfs = require('../promises/fs');
const mkdirp = require('mkdirp');
const watchify = require('watchify');
const babelify = require('babelify');
const babelEnv = require('babel-preset-env');
const babili = require('babel-preset-babili');
const browserify = require('browserify');
const hrTimeHelper = require('../helpers/hrTimeHelper');

const WORKING_DIR = process.cwd();
const DEFAULT_PUBLIC_DIRECTORY = path.join(WORKING_DIR, 'public');
const TEMPORARY_APP_DEFINITIONS_FILENAME = '.appDefinitions.js';
const BROWSER_SCRIPT_FILENAME = 'browser.js';
const APP_DEFAULT_FILENAME = 'app.js';
const EXTERNALS_DEFAULT_FILENAME = 'externals.js';
const APP_DEPENDENCY_ID_REGEXP = process.platform === 'win32' ?	/^(\.|\w:)/ :	/^[\/.]/;

var packageDescriptionString = '';

try {
	const packageDescription = require(path.join(WORKING_DIR, 'package.json'));
	if (packageDescription &&
		packageDescription.name &&
		packageDescription.version) {
		packageDescriptionString = `
/**
 * ${packageDescription.name}: ${packageDescription.version}
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
		 * Current path to the application bundle file.
		 * @type {string}
		 * @private
		 */
		this._appPath = path.join(this._publicPath, (config.appBundleFilename || APP_DEFAULT_FILENAME));

		/**
		 * Current path to the externals bunlde file.
		 * @type {string}
		 * @private
		 */
		this._externalsPath = path.join(this._publicPath, (config.externalsBundleFilename || EXTERNALS_DEFAULT_FILENAME));

		/**
		 * Current path to the __appDefinitions.js.
		 * @type {string}
		 * @private
		 */
		this._appDefinitionsPath = path.join(WORKING_DIR, TEMPORARY_APP_DEFINITIONS_FILENAME);

		/**
		 * Current path to the browser.js.
		 * @type {string}
		 * @private
		 */
		this._entryPath = path.join(WORKING_DIR, BROWSER_SCRIPT_FILENAME);

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
		 * Current app definitions builder.
		 * @type {AppDefinitionsBuilder}
		 * @private
		 */
		this._appDefinitionsBuilder = locator.resolve('appDefinitionsBuilder');

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
		 * Current Browserify app bundler.
		 * @type {Browserify}
		 * @private
		 */
		this._appBundler = null;

		/**
		 * Current Browserify externals bundler.
		 * @type {Browserify}
		 * @private
		 */
		this._externalsBundler = null;

		/**
		 * Current set of external modules.
		 * @type {Object}
		 * @private
		 */
		this._externalModules = {};

		/**
		 * Current app definitions cache.
		 * @type {string}
		 * @private
		 */
		this._appDefinitionsCache = '';
	}

	/**
	 * Builds the browser bundle.
	 * @returns {Promise} The promise for finished work.
	 */
	build() {
		return pfs.exists(this._publicPath)
			.then(isExists => !isExists ? makeDirectory(this._publicPath) : null)
			.then(() => this._createAppDefinitions())
			.then(() => new Promise((fulfill, reject) => this._createAppBundler()
					.once('error', reject)
					.once('bundle', bundleStream => bundleStream
							.once('end', fulfill)
							.on('error', reject)
					)
					.bundle()
				)
			)
			.then(() => new Promise((fulfill, reject) => this._createExternalsBundler()
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
					pfs.unlink(this._appDefinitionsPath) :
					this._watch()
			)
			.catch(reason => this._eventBus.emit('error', reason));
	}

	/**
	 * Creates a app definitions file for the bundler.
	 * @returns {Promise} The promise for finished work.
	 * @private
	 */
	_createAppDefinitions() {
		return Promise.all([
			this._storeFinder.find(),
			this._componentFinder.find()
		])
			.then(found => this._appDefinitionsBuilder.build(found[0], found[1]))
			.then(realAppDefinitions => {
				if (realAppDefinitions === this._appDefinitionsCache) {
					return null;
				}
				this._appDefinitionsCache = realAppDefinitions;
				return pfs.writeFile(this._appDefinitionsPath, realAppDefinitions);
			});
	}

	/**
	 * Creates the browserify bundler for the app or re-uses the existing one.
	 * @returns {Browserify} The browserify instance.
	 * @private
	 */
	_createAppBundler() {
		if (this._appBundler) {
			return this._appBundler;
		}

		this._appBundler = browserify(this._entryPath, {
			cache: {},
			packageCache: {},
			debug: !this._isRelease,
			filter: id => {
				if (APP_DEPENDENCY_ID_REGEXP.test(id)) {
					return true;
				}
				this._externalModules[id] = true;
				return false;
			}
		});

		this._appBundler.require(
			this._appDefinitionsPath, {expose: 'appDefinitions'}
		);
		this._appBundler.external('catberry');

		if (!this._isRelease) {
			this._appBundler.plugin(watchify);
			this._eventBus.emit('info', 'Watching files for changes to rebuild the app bundle...');
		}

		this._attachExtensionsToBundler(this._appBundler);

		var startTime;
		const resetHandler = () => {
			this._eventBus.emit('info', `Building browser script bundle for the app at "${this._appPath}"...`);
			startTime = hrTimeHelper.get();
		};

		this._appBundler
			.on('update', ids => {
				this._eventBus.emit('appBundleChanged', {
					path: this._appPath,
					changedFiles: ids
				});

				this._appBundler.bundle();
			})
			.on('error', error => this._eventBus.emit('error', error))
			.on('reset', resetHandler)
			.on('bundle', sourceStream => {
				const outputStream = fs.createWriteStream(this._appPath);
				if (this._isRelease) {
					outputStream.write(packageDescriptionString);
				}
				outputStream.once('finish', () => {
					const hrTime = hrTimeHelper.get(startTime);
					this._eventBus.emit('appBundleBuilt', {
						path: this._appPath,
						hrTime,
						time: hrTimeHelper.toMilliseconds(hrTime)
					});
				});
				sourceStream.pipe(outputStream);
			});

		resetHandler(); // to set startTime universally.
		return this._appBundler;
	}

	/**
	 * Creates the browserify bundler for externals or re-uses the existing one.
	 * @returns {Browserify} The browserify instances.
	 * @private
	 */
	_createExternalsBundler() {
		if (this._externalsBundler) {
			return this._externalsBundler;
		}

		this._externalsBundler = browserify({
			cache: {},
			packageCache: {},
			debug: !this._isRelease
		});
		this._externalsBundler.require(Object.keys(this._externalModules));
		this._externalsBundler.external('appDefinitions');
		this._attachExtensionsToBundler(this._externalsBundler);

		const startTime = hrTimeHelper.get();
		this._eventBus.emit('info', `Building browser script bundle for externals at "${this._externalsPath}"...`);

		this._externalsBundler
			.on('error', error => this._eventBus.emit('error', error))
			.on('bundle', sourceStream => {
				const outputStream = fs.createWriteStream(this._externalsPath);
				outputStream.once('finish', () => {
					const hrTime = hrTimeHelper.get(startTime);
					this._eventBus.emit('externalsBundleBuilt', {
						path: this._externalsPath,
						hrTime,
						time: hrTimeHelper.toMilliseconds(hrTime)
					});
				});
				sourceStream.pipe(outputStream);
			});

		return this._externalsBundler;
	}

	/**
	 * Attaches necessary plugins and transformations to the bundle.
	 * @param {Browserify} bundler The bundler to attach extensions.
	 */
	_attachExtensionsToBundler(bundler) {
		const isDebug = !this._isRelease;

		const presets = [[
			babelEnv, {
				targets: {
					browsers: [
						'last 2 versions',
						'not ie <= 10'
					]
				},
				debug: isDebug
			}
		]];

		if (this._isRelease) {
			presets.push(babili);
		}

		bundler.transform(babelify, {
			global: true,
			ast: false,
			comments: false,
			presets,
			sourceMap: isDebug
		});

		this._setTransformations(bundler);
		this._setPlugins(bundler);
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
		const watchHandler = this._createAppDefinitions.bind(this);
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
			this._appBundler.transform(
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
			this._appBundler.plugin(
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
