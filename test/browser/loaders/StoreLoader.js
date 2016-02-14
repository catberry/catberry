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
	StoreLoader = require('../../../browser/loaders/StoreLoader');

describe('lib/loaders/StoreLoader', function() {
	it('should properly load stores', function(done) {
		var locator = createLocator({
			isRelease: true
		});

		locator.registerInstance('store', {
			name: 'Test1',
			constructor: function ctr1() {}
		});
		locator.registerInstance('store', {
			name: 'Test2',
			constructor: function ctr2() {}
		});

		var stores = locator.resolveAll('store').reverse(),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 2);
				var store1 = loadedStores[storeNames[0]],
					store2 = loadedStores[storeNames[1]];
				assert.strictEqual(store1.name, stores[0].name);
				assert.strictEqual(store1.constructor, stores[0].constructor);
				assert.strictEqual(store2.name, stores[1].name);
				assert.strictEqual(store2.constructor, stores[1].constructor);
				done();
			})
			.catch(done);
	});

	it('should not load stores twice', function(done) {
		var locator = createLocator({
			isRelease: true
		});

		locator.registerInstance('store', {
			name: 'Test1',
			constructor: function ctr1() {}
		});
		locator.registerInstance('store', {
			name: 'Test2',
			constructor: function ctr2() {}
		});

		var stores = locator.resolveAll('store').reverse(),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 2);
				var store1 = loadedStores[storeNames[0]],
					store2 = loadedStores[storeNames[1]];
				assert.strictEqual(store1.name, stores[0].name);
				assert.strictEqual(store1.constructor, stores[0].constructor);
				assert.strictEqual(store2.name, stores[1].name);
				assert.strictEqual(store2.constructor, stores[1].constructor);
				locator.unregister('store');
				return loader.load();
			})
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 2);
			})
			.then(done)
			.catch(done);
	});

	it('should properly transform stores', function(done) {
		var locator = createLocator({
			isRelease: true
		});

		locator.registerInstance('store', {
			name: 'Test1',
			constructor: function ctr1() {}
		});
		locator.registerInstance('store', {
			name: 'Test2',
			constructor: function ctr2() {}
		});

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

		var stores = locator.resolveAll('store').reverse(),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 2);
				var store1 = loadedStores[storeNames[0]],
					store2 = loadedStores[storeNames[1]];
				assert.strictEqual(store1.name, 'Test1!?');
				assert.strictEqual(store1.constructor, stores[0].constructor);
				assert.strictEqual(store2.name, 'Test2!?');
				assert.strictEqual(store2.constructor, stores[1].constructor);
				done();
			})
			.catch(done);
	});

	it('should skip transform errors', function(done) {
		var locator = createLocator({
			isRelease: true
		});

		locator.registerInstance('store', {
			name: 'Test1',
			constructor: function ctr1() {}
		});
		locator.registerInstance('store', {
			name: 'Test2',
			constructor: function ctr2() {}
		});

		locator.registerInstance('storeTransform', {
			transform: function(store) {
				store.name = store.name += '!';
				return store;
			}
		});
		locator.registerInstance('storeTransform', {
			transform: function(store) {
				if (store.name === 'Test1!') {
					throw new Error('Test');
				}
				store.name = store.name += '?';
				return Promise.resolve(store);
			}
		});

		var stores = locator.resolveAll('store').reverse(),
			loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				var storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 1);
				var store1 = loadedStores[storeNames[0]];
				assert.strictEqual(store1.name, 'Test2!?');
				assert.strictEqual(store1.constructor, stores[1].constructor);
				done();
			})
			.catch(done);
	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	var eventBus = new events.EventEmitter();
	eventBus.on('error', function() {});
	locator.registerInstance('eventBus', eventBus);
	locator.register('storeLoader', StoreLoader);
	return locator;
}
