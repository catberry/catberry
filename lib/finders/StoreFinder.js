'use strict';

const path = require('path');
const requireHelper = require('../helpers/requireHelper');
const events = require('events');
const chokidar = require('chokidar');
const glob = require('glob');

const DEFAULT_STORES_ROOT = 'catberry_stores';
const DEFAULT_STORES_GLOB = '**/*.js';

const CHOKIDAR_OPTIONS = {
	ignoreInitial: true,
	cwd: process.cwd(),
	ignorePermissionErrors: true
};

/**
 * Implements the store finder module.
 */
class StoreFinder extends events.EventEmitter {

	/**
	 * Creates a new instance of the store finder.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {
		super();

		const config = locator.resolve('config');

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current folder with Catberry stores.
		 * @type {string}
		 */
		this._storesDirectory = requireHelper.getValidPath(
			config.storesDirectory || DEFAULT_STORES_ROOT
		);

		/**
		 * Current glob for the store files.
		 * @type {string}
		 */
		this._storesGlobExpression = requireHelper.getValidPath(path.join(
			this._storesDirectory, config.storesGlob || DEFAULT_STORES_GLOB
		));

		/**
		 * Current Promise for the ready state.
		 * @type {Promise}
		 * @private
		 */
		this._readyPromise = null;

		/**
		 * Current Map of last found stores by their names.
		 * @type {Map}
		 * @private
		 */
		this._foundStoresByNames = null;
	}

	/**
	 * Finds all the stores.
	 * @returns {Promise<Map>} The Promise for Map of found stores by names.
	 */
	find() {
		if (this._foundStoresByNames) {
			return Promise.resolve(this._foundStoresByNames);
		}

		this._foundStoresByNames = Object.create(null);

		return new Promise((fulfill, reject) => {
			const storeFilesGlob = new glob.Glob(this._storesGlobExpression, {
				nosort: true,
				silent: true,
				nodir: true
			});

			storeFilesGlob
				.on('match', match => {
					const storeDescriptor = this._createStoreDescriptor(match);
					this._foundStoresByNames[storeDescriptor.name] = storeDescriptor;
					this._eventBus.emit('storeFound', storeDescriptor);
				})
				.on('error', error => reject(error))
				.on('end', fulfill);
		})
		.then(() => this._foundStoresByNames);
	}

	/**
	 * Watches the components for changing.
	 */
	watch() {
		if (this._readyPromise) {
			return this._readyPromise;
		}

		const fileWatcher = chokidar.watch(
			this._storesGlobExpression, CHOKIDAR_OPTIONS
		);
		const fileWatcherPromise = new Promise((fulfill, reject) => {
			fileWatcher
				.once('ready', () => fulfill())
				.once('error', error => reject(error));
		});

		this._readyPromise = fileWatcherPromise
			.then(() => {

				fileWatcher
					.on('error', error => this._eventBus.emit('error', error))
					.on('add', filename => {
						const store = this._createStoreDescriptor(filename);
						this._foundStoresByNames[store.name] = store;
						this.emit('add', store);
					})
					.on('change', filename => {
						const store = this._createStoreDescriptor(filename);
						this._foundStoresByNames[store.name] = store;
						this.emit('change', store);
					})
					.on('unlink', filename => {
						const store = this._createStoreDescriptor(filename);
						delete this._foundStoresByNames[store.name];
						this.emit('unlink', store);
					});
				this.emit('watchReady');
				return fileWatcher;
			});

		return this._readyPromise;
	}

	/**
	 * Closes watcher.
	 * @returns {Promise} Promise of closed watcher.
	 */
	closeWatch() {
		if (this._readyPromise) {
			const promise = this._readyPromise;

			this._readyPromise = null;

			return promise.then(watcher => watcher.close());
		}

		return Promise.resolve();
	}

	/**
	 * Creates a descriptor for the found store.
	 * @param {string} filename The store's filename.
	 * @returns {{name: string, path: string}} The store descriptor.
	 * @private
	 */
	_createStoreDescriptor(filename) {
		const relative = path.relative(this._storesDirectory, filename);
		const basename = path.basename(relative, path.extname(relative));
		const directory = path.dirname(relative);
		const storeName = directory !== '.' ?
			path.dirname(relative) + path.sep + basename : basename;

		return {
			name: storeName.replace(/\\/g, '/'), // normalize name for windows
			path: path.relative(process.cwd(), filename)
		};
	}
}

module.exports = StoreFinder;
