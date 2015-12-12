/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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

module.exports = StoreLoader;

var util = require('util'),
	LoaderBase = require('../../lib/base/LoaderBase');

util.inherits(StoreLoader, LoaderBase);

/**
 * Creates instance of the store loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve stores.
 * @constructor
 * @extends LoaderBase
 */
function StoreLoader($serviceLocator) {
	this._serviceLocator = $serviceLocator;
	this._eventBus = $serviceLocator.resolve('eventBus');
	LoaderBase.call(this, $serviceLocator.resolveAll('storeTransform'));
}

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
StoreLoader.prototype._eventBus = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
StoreLoader.prototype._serviceLocator = null;

/**
 * Current set of loaded stores.
 * @type {Object}
 * @private
 */
StoreLoader.prototype._loadedStores = null;

/**
 * Loads all stores when it is in a browser.
 * @returns {Promise} Promise for nothing.
 */
StoreLoader.prototype.load = function () {
	if (this._loadedStores) {
		return Promise.resolve(this._loadedStores);
	}

	this._loadedStores = Object.create(null);
	var self = this;

	return Promise.resolve()
		.then(function () {
			var stores = self._serviceLocator.resolveAll('store'),
				storePromises = [];

			// the list is a stack, we should reverse it
			stores.forEach(function (store) {
				storePromises.unshift(
					self._getStore(store)
				);
			});

			return Promise.all(storePromises);
		})
		.then(function (stores) {
			stores.forEach(function (store) {
				if (!store || typeof (store) !== 'object') {
					return;
				}
				self._loadedStores[store.name] = store;
			});
			self._eventBus.emit('allStoresLoaded', self._loadedStores);
			return Promise.resolve(self._loadedStores);
		});
};

/**
 * Gets the store from store details.
 * @param {Object} storeDetails Store details.
 * @returns {Promise<Object>} Promise for store.
 * @private
 */
StoreLoader.prototype._getStore = function (storeDetails) {
	var self = this;
	return this._applyTransforms(storeDetails)
		.then(function (transformed) {
			self._eventBus.emit('storeLoaded', transformed);
			return transformed;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
			return null;
		});
};

/**
 * Gets stores map by names.
 * @returns {Object} Map of stores by names.
 */
StoreLoader.prototype.getStoresByNames = function () {
	return this._loadedStores || Object.create(null);
};