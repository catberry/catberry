'use strict';

const requireHelper = require('../helpers/requireHelper');
const path = require('path');
const LoaderBase = require('../base/LoaderBase');

/**
 * Implements the component Loader class for server environment.
 */
class StoreLoader extends LoaderBase {

	/**
	 * Creates a new instance of the store loader.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {
		var storeTransforms;
		try {
			storeTransforms = locator.resolveAll('storeTransform');
		} catch (e) {
			storeTransforms = [];
		}
		super(locator, storeTransforms);

		/**
		 * Current logger.
		 * @type {Logger}
		 * @private
		 */
		this._logger = locator.resolve('logger');

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current store finder.
		 * @type {StoreFinder}
		 * @private
		 */
		this._storeFinder = locator.resolve('storeFinder');

		/**
		 * Current release flag.
		 * @type {boolean}
		 * @private
		 */
		this._isRelease = Boolean(locator.resolve('config').isRelease);

		/**
		 * Current map of loaded stores by their names.
		 * @type {Object}
		 * @private
		 */
		this._loadedStores = null;
	}

	/**
	 * Loads all stores into the memory.
	 * @returns {Promise<Object>} The promise for a map of the loaded stores.
	 */
	load() {
		if (this._loadedStores) {
			return Promise.resolve(this._loadedStores);
		}

		const result = Object.create(null);

		return this._storeFinder.find()
			.then(details => {
				const storePromises = Object.keys(details)
					.map(storeName => this._getStore(details[storeName]));
				return Promise.all(storePromises);
			})
			.then(stores => {
				stores.forEach(store => {
					if (!store || typeof (store) !== 'object') {
						return;
					}

					result[store.name] = store;
				});

				this._loadedStores = result;

				if (!this._isRelease) {
					this._logger.info('Watching stores for changes');
					this._storeFinder.watch();
					this._handleChanges();
				}

				this._eventBus.emit('allStoresLoaded', result);
				return this._loadedStores;
			});
	}

	/**
	 * Gets current map of stores by their names.
	 * @returns {Object} The map of stores by their names.
	 */
	getStoresByNames() {
		return this._loadedStores || Object.create(null);
	}

	/**
	 * Gets a store object by the found store details.
	 * @param {Object} storeDetails The found details.
	 * @returns {Object} The store object.
	 * @private
	 */
	_getStore(storeDetails) {
		var constructor;
		try {
			constructor = require(requireHelper.getAbsoluteRequirePath(storeDetails.path));
		} catch (e) {
			this._eventBus.emit('error', e);
			return Promise.resolve(null);
		}

		if (typeof (constructor) !== 'function') {
			const errorMessage = `Store's file ${storeDetails.path} should export a constructor function or a class`;
			this._eventBus.emit('error', new Error(errorMessage));
			return Promise.resolve(null);
		}

		const result = Object.create(storeDetails);
		result.constructor = constructor;

		return this._applyTransforms(result)
			.then(transformed => {
				this._eventBus.emit('storeLoaded', transformed);
				return transformed;
			})
			.catch(error => {
				this._eventBus.emit('error', error);
				return null;
			});
	}

	/**
	 * Handles changes while watching.
	 * @private
	 */
	_handleChanges() {
		const loadStore = storeDetails => {
			this._getStore(storeDetails)
				.then(store => {
					this._loadedStores[storeDetails.name] = store;
				});
		};

		this._storeFinder
			.on('add', storeDetails => {
				this._logger.info(`Store "${storeDetails.path}" has been added, initializing...`);
				requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(storeDetails.path));
				loadStore(storeDetails);
			})
			.on('change', storeDetails => {
				this._logger.info(`Store "${storeDetails.path}" has been changed, reinitializing...`);
				requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(storeDetails.path));
				loadStore(storeDetails);
			})
			.on('unlink', storeDetails => {
				this._logger.info(`Store "${storeDetails.path}" has been unlinked, removing...`);
				requireHelper.clearCacheKey(requireHelper.getAbsoluteRequirePath(storeDetails.path));
				delete this._loadedStores[storeDetails.name];
			});
	}
}

module.exports = StoreLoader;
