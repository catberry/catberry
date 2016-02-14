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

var assert = require('assert'),
	events = require('events'),
	ServiceLocator = require('catberry-locator'),
	StoreLoader = require('../../../lib/loaders/StoreLoader'),
	ContextFactory = require('../../../lib/ContextFactory'),
	ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider'),
	CookieWrapper = require('../../../lib/CookieWrapper'),
	StoreFinder = require('../../mocks/finders/StoreFinder'),
	Logger = require('../../mocks/Logger');

describe('lib/loaders/StoreLoader', function() {
	it('should properly load stores', function(done) {
		var stores = {
				Test1: {
					name: 'Test1',
					path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
				}
			},
			locator = createLocator({
				isRelease: true
			}, stores),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 1);
				var store = loadedStores[storeNames[0]];
				assert.strictEqual(store.name, stores.Test1.name);
				assert.strictEqual(typeof (store.constructor), 'function');
				done();
			})
			.catch(done);
	});
	it('should properly transform stores', function(done) {
		var stores = {
				Test1: {
					name: 'Test1',
					path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
				}
			},
			locator = createLocator({
				isRelease: true
			}, stores);

		locator.registerInstance('storeTransform', {
			transform: function(store) {
				store.name = store.name += '!';
				return store;
			}
		});
		locator.registerInstance('storeTransform', {
			transform: function(store) {
				store.name = store.name += '?';
				return Promise.resolve(store);
			}
		});

		var loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 1);
				var store = loadedStores[storeNames[0]];
				assert.strictEqual(store.name, stores.Test1.name + '!?');
				assert.strictEqual(typeof (store.constructor), 'function');
				done();
			})
			.catch(done);
	});
	it('should emit error when constructor is not a function', function(done) {
		var stores = {
				Wrong: {
					name: 'Wrong',
					path: 'test/cases/lib/loaders/StoreLoader/Wrong.js'
				}
			},
			errorHandler = function(error) {
				assert.strictEqual(error instanceof Error, true);
				assert.strictEqual(
					error.message,
					'Store file test/cases/lib/loaders/StoreLoader/Wrong.js ' +
					'should export a constructor function'
				);
				done();
			},
			locator = createLocator({
				isRelease: true
			}, stores, errorHandler),
			eventBus = locator.resolve('eventBus'),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 0);
			})
			.catch(done);
	});
	it('should emit error when wrong path', function(done) {
		var stores = {
				Wrong: {
					name: 'Wrong',
					path: 'wrong/path'
				}
			},
			errorHandler = function(error) {
				assert.strictEqual(error instanceof Error, true);
				done();
			},
			locator = createLocator({
				isRelease: true
			}, stores, errorHandler),
			eventBus = locator.resolve('eventBus'),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 0);
			})
			.catch(done);
	});
});

function createLocator(config, stores, errorHandler) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	var eventBus = new events.EventEmitter();
	if (errorHandler) {
		eventBus.on('error', errorHandler);
	}
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('storeFinder', new StoreFinder(stores));
	locator.register('contextFactory', ContextFactory);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('storeLoader', StoreLoader);
	locator.register('logger', Logger, config);
	return locator;
}
