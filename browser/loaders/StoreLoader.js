'use strict';

const LoaderBase = require('../../lib/base/LoaderBase');

class StoreLoader extends LoaderBase {

	/**
	 * Creates a new instance of the store loader.
	 * @param {ServiceLocator} locator The service locator for resolving stores.
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
		 * Current set of loaded stores.
		 * @type {Object}
		 * @private
		 */
		this._loadedStores = null;
	}

	/**
	 * Loads all stores inside the browser bundle.
	 * @returns {Promise<Object>} The promise loaded stores.
	 */
	load() {
		if (this._loadedStores) {
			return Promise.resolve(this._loadedStores);
		}

		this._loadedStores = Object.create(null);

		return Promise.resolve()
			.then(() => this._serviceLocator.resolveAll('store'))
			.catch(() => [])
			.then(stores => {
				const storePromises = [];
				// the list is a stack, we should reverse it
				stores.forEach(store => storePromises.unshift(this._getStore(store)));
				return Promise.all(storePromises);
			})
			.then(stores => {
				stores.forEach(store => {
					if (!store || typeof (store) !== 'object') {
						return;
					}
					this._loadedStores[store.name] = store;
				});
				this._eventBus.emit('allStoresLoaded', this._loadedStores);
				return Promise.resolve(this._loadedStores);
			});
	}

	/**
	 * Gets astore from store details.
	 * @param {Object} storeDetails The store details.
	 * @returns {Promise<Object>} The promise for the store.
	 * @private
	 */
	_getStore(storeDetails) {
		return this._applyTransforms(storeDetails)
			.then(transformed => {
				this._eventBus.emit('storeLoaded', transformed);
				return transformed;
			})
			.catch(reason => {
				this._eventBus.emit('error', reason);
				return null;
			});
	}

	/**
	 * Gets a stores map by their names.
	 * @returns {Object} The map of stores by their names.
	 */
	getStoresByNames() {
		return this._loadedStores || Object.create(null);
	}
}

module.exports = StoreLoader;
