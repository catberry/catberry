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

var URI = require('catberry-uri').URI,
	requireHelper = require('../helpers/requireHelper'),
	util = require('util'),
	path = require('path');

var ERROR_CONSTRUCTOR_SHOULD_BE_FUNCTION =
	'Store file %s should export a constructor function',
	INFO_WATCHING_FILES = 'Watching stores for changes',
	INFO_COMPONENTS_CHANGED = 'Stores have been changed, reloading...';

/**
 * Creates new instance of store loader.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {Boolean} isRelease Release mode flag.
 * @constructor
 */
function StoreLoader($serviceLocator, isRelease) {
	this._serviceLocator = $serviceLocator;
	this._logger = $serviceLocator.resolve('logger');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._storeFinder = $serviceLocator.resolve('storeFinder');
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._isRelease = Boolean(isRelease);
}

/**
 * Current release flag.
 * @type {boolean}
 * @private
 */
StoreLoader.prototype._isRelease = false;

/**
 * Current map of loaded stores by names.
 * @type {Object}
 * @private
 */
StoreLoader.prototype._loadedStores = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
StoreLoader.prototype._logger = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
StoreLoader.prototype._eventBus = null;

/**
 * Current store finder.
 * @type {StoreFinder}
 * @private
 */
StoreLoader.prototype._storeFinder = null;

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
StoreLoader.prototype._contextFactory = null;

/**
 * Loads all stores into a memory.
 * @returns {Promise<Object>} Promise for map of loaded stores.
 */
StoreLoader.prototype.load = function () {
	var self = this,
		result = {};

	return this._storeFinder.find()
		.then(function (details) {
			var storePromises = Object.keys(details)
					.map(function (storeName) {
						return self._getStore(details[storeName]);
					});

			return Promise.all(storePromises);
		})
		.then(function (storeList) {
			storeList.forEach(function (store) {
				if (!store) {
					return;
				}

				result[store.name] = store;
			});

			self._loadedStores = result;

			if (!self._isRelease) {
				self._logger.info(INFO_WATCHING_FILES);
				self._storeFinder.watch(function () {
					self._logger.info(INFO_COMPONENTS_CHANGED);
					requireHelper.clearCache();
					self.load();
				});
			}

			self._eventBus.emit('allStoresLoaded', result);
			return self._loadedStores;
		});
};

/**
 * Gets current map of stores by names.
 * @returns {Object} Map of stores by name.
 */
StoreLoader.prototype.getStoresByNames = function () {
	return this._loadedStores || {};
};

/**
 * Gets store object by found store details.
 * @param {Object} storeDetails Found details.
 * @returns {Object} Store object
 * @private
 */
StoreLoader.prototype._getStore = function (storeDetails) {
	var constructor;
	try {
		constructor = require(process.cwd() + '/' + storeDetails.path);
	} catch (e) {
		this._eventBus.emit('error', e);
	}

	if (typeof(constructor) !== 'function') {
		var errorMessage = util.format(
			ERROR_CONSTRUCTOR_SHOULD_BE_FUNCTION,
			storeDetails.path
		);
		this._eventBus.emit('error', new Error(errorMessage));
		return null;
	}

	var storeContext = Object.create(this._contextFactory.createStub());
	storeContext.name = storeDetails.name;
	constructor.prototype.$context = storeContext;

	var result = Object.create(storeDetails);
	result.constructor = constructor;
	this._eventBus.emit('storeLoaded', result);

	return result;
};