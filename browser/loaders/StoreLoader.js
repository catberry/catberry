'use strict';

const LoaderBase = require('../../lib/base/LoaderBase');

class StoreLoader extends LoaderBase {

	/**
	 * Creates instance of the store loader.
	 * @param {ServiceLocator} locator Locator to resolve stores.
	 * @constructor
	 * @extends LoaderBase
	 */
	constructor(locator) {
		var storeTransforms;
		try {
			storeTransforms = locator.resolveAll('storeTransform');
		} catch (e) {
			storeTransforms = [];
		}
		super(storeTransforms);

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
	 * Loads all stores when it is in a browser.
	 * @returns {Promise} Promise for nothing.
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
	 * Gets the store from store details.
	 * @param {Object} storeDetails Store details.
	 * @returns {Promise<Object>} Promise for store.
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
	 * Gets stores map by names.
	 * @returns {Object} Map of stores by names.
	 */
	getStoresByNames() {
		return this._loadedStores || Object.create(null);
	}
}

module.exports = StoreLoader;
