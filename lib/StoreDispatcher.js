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

module.exports = StoreDispatcher;

var util = require('util'),
	moduleHelper = require('./helpers/moduleHelper');

var ERROR_STORE_NOT_FOUND = 'Store %s not found',
	DEFAULT_LIFETIME = 60000;

/**
 * Creates new instance of store dispatcher.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {StoreLoader} $storeLoader Store loader to load stores.
 * @param {EventEmitter} $eventBus Event bus to emit events.
 * @constructor
 */
function StoreDispatcher($serviceLocator, $storeLoader, $eventBus) {
	var self = this;
	this._serviceLocator = $serviceLocator;
	this._storeLoader = $storeLoader;
	this._eventBus = $eventBus;
	this._storeInstances = {};
	this._lastData = {};
	this._storesLoading = this._storeLoader
		.load()
		.then(function () {
			self._storesLoading = null;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
StoreDispatcher.prototype._serviceLocator = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
StoreDispatcher.prototype._eventBus = null;

/**
 * Current store loader.
 * @type {StoreLoader}
 * @private
 */
StoreDispatcher.prototype._storeLoader = null;

/**
 * Current promise of store loading state.
 * @type {Promise|null}
 * @private
 */
StoreDispatcher.prototype._storesLoading = null;

/**
 * Current map of all store instances.
 * @type {null}
 * @private
 */
StoreDispatcher.prototype._storeInstances = null;

/**
 * Current map of last data of each store.
 * @type {Object}
 * @private
 */
StoreDispatcher.prototype._lastData = null;

/**
 * Current map of last state of store dispatcher.
 * @type {Object}
 * @private
 */
StoreDispatcher.prototype._lastState = null;

/**
 * Current action queue.
 * @type {ActionQueue}
 * @private
 */
StoreDispatcher.prototype._actionQueue = null;

/**
 * Gets store data and creates store instance if required.
 * @param {String} storeName Name of store.
 * @param {Object} basicContext Basic context.
 * @returns {Object} Store's data.
 */
StoreDispatcher.prototype.getStoreData = function (storeName, basicContext) {
	if (this._lastData[storeName]) {
		var existTime = Date.now() - this._lastData[storeName].createdAt;
		if (existTime <= this._lastData[storeName].lifetime) {
			return Promise.resolve(this._lastData[storeName].data);
		}
		this._lastData[storeName] = null;
	}
	var self = this,
		lifetime = DEFAULT_LIFETIME;
	self._eventBus.emit('storeDataLoad', {name: storeName});
	return this._getStoreInstance(storeName)
		.then(function (store) {
			store.$context = self._getStoreContext(storeName, basicContext);
			if (typeof(store.$lifetime) === 'number') {
				lifetime = store.$lifetime;
			}
			var dataPromise,
				loadMethod = moduleHelper.getMethodToInvoke(store, 'load');
			try {
				dataPromise = Promise.resolve(loadMethod());
			} catch(e) {
				dataPromise = Promise.reject(e);
			}
			return dataPromise;
		})
		.then(function (data) {
			self._lastData[storeName] = {
				data: data,
				lifetime: lifetime,
				createdAt: Date.now()
			};
			self._eventBus.emit('storeDataLoaded', {
				name: storeName,
				data: data,
				lifetime: lifetime
			});
			return data;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
			throw reason;
		});
};

/**
 * Sends action to specified store and resolves promises in serial mode.
 * @param {Object} basicContext Basic context.
 * @param {String} storeName Name of the store.
 * @param {String} actionName Name of the action.
 * @param {Object} args Action arguments.
 * @returns {Promise<*>} Promise for action handling result.
 */
StoreDispatcher.prototype.sendAction =
	function (basicContext, storeName, actionName, args) {
		var self = this,
			actionDetails = {
				storeName: storeName,
				actionName: actionName,
				args: args
			};
		this._eventBus.emit('actionSend', actionDetails);
		return this._getStoreInstance(storeName)
			.then(function (store) {
				store.$context = self._getStoreContext(
					storeName,
					basicContext
				);
				var handlePromise,
					handleMethod = moduleHelper.getMethodToInvoke(
						store, 'load', actionName
					);
				try {
					handlePromise = Promise.resolve(
						handleMethod(args)
					);
				} catch(e) {
					handlePromise = Promise.reject(e);
				}
				return handlePromise;
			})
			.then(function (result) {
				self._eventBus.emit('actionSend', actionDetails);
				return result;
			})
			.catch(function (reason) {
				self._eventBus.emit('error', reason);
				throw reason;
			});
	};

/**
 * Sends action to every store that has handle method for such action.
 * @param {Object} basicContext Basic context.
 * @param {String} actionName Name of the action.
 * @param {Object} arg Action arguments.
 * @returns {Promise<Array<*>>} Promise for action handling result.
 */
StoreDispatcher.prototype.sendBroadcastAction =
	function (basicContext, actionName, arg) {
		var promises = [],
			self = this,
			storesByNames = this._storeLoader.getStoresByNames(),
			methodName = moduleHelper.getCamelCaseName('handle', actionName);
		Object.keys(storesByNames)
			.forEach(function (storeName) {
				var store = storesByNames[storeName],
					protoMethod = store.constructor.prototype[methodName];
				if (typeof(protoMethod) !== 'function') {
					return;
				}
				var sendActionPromise = self.sendAction(
					basicContext, store.name, actionName,  arg
				);
				promises.push(sendActionPromise);
			});
		return Promise.all(promises);
	};

/**
 * Sets new state to store dispatcher and invokes 'changed' method of all
 * stores which state was changed.
 * @param {Object} parameters Map of new parameters.
 */
StoreDispatcher.prototype.setState = function (parameters) {
	var self = this;
	if (!this._lastState) {
		this._lastState = parameters;
		return Object.keys(parameters)
			.filter(function (storeName) {
				return storeName in self._storeInstances;
			});
	}

	// some module's parameters can be removed since last time
	var changed = {};

	Object.keys(this._lastState)
		.filter(function (storeName) {
			return !(storeName in parameters);
		})
		.forEach(function (name) {
			changed[name] = true;
		});

	Object.keys(parameters)
		.forEach(function (storeName) {
			// new parameters were set for module
			if (!(storeName in self._lastState)) {
				changed[storeName] = true;
				return;
			}

			// new and last parameters has different values
			var lastParameterNames =
					Object.keys(self._lastState[storeName]),
				currentParameterNames =
					Object.keys(parameters[storeName]);

			if (currentParameterNames.length !==
				lastParameterNames.length) {
				changed[storeName] = true;
				return;
			}

			currentParameterNames.every(function (parameterName) {
				if (parameters[storeName][parameterName] !==
					self._lastState[storeName][parameterName]) {
					changed[storeName] = true;
					return false;
				}
				return true;
			});
		});
	this._eventBus.emit('stateChanged', {
		oldState: this._lastState,
		newState: parameters
	});
	this._lastState = parameters;
	return Object.keys(changed)
		.filter(function (storeName) {
			return (storeName in self._storeInstances);
		});
};

/**
 * Gets context for store using component's context as a prototype.
 * @param {String} storeName Name of store.
 * @param {Object} basicContext Basic context.
 * @returns {Object} Store context.
 * @private
 */
StoreDispatcher.prototype._getStoreContext =
	function (storeName, basicContext) {
		var self = this,
			storeContext = Object.create(basicContext);
		storeContext.name = storeName;
		storeContext.state = this._lastState[storeName] || {};
		storeContext.changed = function () {
			self._lastData[storeName] = null;
			self._eventBus.emit('storeChanged', storeName);
		};

		return storeContext;
	};

/**
 * Gets store instance and creates it if required.
 * @param {String} storeName Name of store.
 * @returns {Promise<Object>} Promise for store.
 * @private
 */
StoreDispatcher.prototype._getStoreInstance = function (storeName) {
	var store = this._storeInstances[storeName];
	if (store) {
		return Promise.resolve(store);
	}
	var self = this;
	return this._getPromiseForReadyState()
		.then(function () {
			var stores = self._storeLoader.getStoresByNames(),
				config = self._serviceLocator.resolve('config');
			if (!(storeName in stores)) {
				throw new Error(util.format(
					ERROR_STORE_NOT_FOUND, storeName
				));
			}
			self._storeInstances[storeName] = self._serviceLocator
				.resolveInstance(stores[storeName].constructor, config);
			return self._storeInstances[storeName];
		});
};

/**
 * Gets promise for ready state when loading stores.
 * @returns {Promise} Promise for nothing.
 * @private
 */
StoreDispatcher.prototype._getPromiseForReadyState = function () {
	return this._storesLoading ? this._storesLoading : Promise.resolve();
};