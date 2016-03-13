'use strict';

const assert = require('assert');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const StoreLoader = require('../../../browser/loaders/StoreLoader');
const storeMocks = require('../../mocks/stores');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/loaders/StoreLoader', function() {
	var locator;
	beforeEach(function() {
		locator = createLocator({
			isRelease: true
		});
	});

	it('should properly load stores', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				constructor: storeMocks.SyncDataStore
			},
			Test2: {
				name: 'Test2',
				constructor: storeMocks.AsyncDataStore
			}
		};
		registerStores(stores);

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				assert.deepEqual(loadedStores, stores);
			})
			.then(done)
			.catch(done);
	});

	it('should load nothing if an error occurs', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				constructor: storeMocks.SyncDataStore
			}
		};
		registerStores(stores);

		const eventBus = locator.resolve('eventBus');
		eventBus.on('storeLoaded', () => {
			throw new Error('TestError');
		});
		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => assert.deepEqual(loadedStores, {}))
			.then(done)
			.catch(done);
	});

	it('should load nothing if no stores are registered', function(done) {
		registerStores({});
		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => assert.deepEqual(loadedStores, {}))
			.then(done)
			.catch(done);
	});

	it('should load nothing if no store objects are registered', function(done) {
		registerStores({some: 'wrong'});
		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => assert.deepEqual(loadedStores, {}))
			.then(done)
			.catch(done);
	});

	it('should return an empty object if the load method has not been called yet', function() {
		const loader = locator.resolve('storeLoader');
		assert.deepEqual(loader.getStoresByNames(), {});
	});

	it('should not load stores twice', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				constructor: storeMocks.SyncDataStore
			},
			Test2: {
				name: 'Test2',
				constructor: storeMocks.AsyncDataStore
			}
		};
		registerStores(stores);

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				assert.deepEqual(loadedStores, stores);
				locator.unregister('store');
				return loader.load();
			})
			.then(function(loadedStores) {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				assert.deepEqual(loadedStores, stores);
			})
			.then(done)
			.catch(done);
	});

	it('should properly transform stores', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				constructor: storeMocks.SyncDataStore
			},
			Test2: {
				name: 'Test2',
				constructor: storeMocks.AsyncDataStore
			}
		};
		registerStores(stores);
		locator.registerInstance('storeTransform', {
			transform: store => {
				store.name += '!';
				return store;
			}
		});
		locator.registerInstance('storeTransform', {
			transform: store => {
				store.name += '?';
				return Promise.resolve(store);
			}
		});

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores['Test1!?'].name, 'Test1!?');
				assert.strictEqual(loadedStores['Test2!?'].name, 'Test2!?');
			})
			.then(done)
			.catch(done);
	});

	it('should skip transform errors', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				constructor: storeMocks.SyncDataStore
			},
			Test2: {
				name: 'Test2',
				constructor: storeMocks.AsyncDataStore
			}
		};
		registerStores(stores);
		locator.registerInstance('storeTransform', {
			transform: store => {
				store.name += '!';
				return store;
			}
		});
		locator.registerInstance('storeTransform', {
			transform: store => Promise.reject(new Error('Wrong!'))
		});

		locator.registerInstance('storeTransform', {
			transform: store => {
				throw new Error('Wrong!');
			}
		});

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores['Test1!'].name, 'Test1!');
				assert.strictEqual(loadedStores['Test2!'].name, 'Test2!');
			})
			.then(done)
			.catch(done);
	});

	it('should throw error if transform returns a bad result', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				constructor: storeMocks.SyncDataStore
			}
		};
		registerStores(stores);
		locator.registerInstance('storeTransform', {
			transform: store => null
		});

		const eventBus = locator.resolve('eventBus');
		const loader = locator.resolve('storeLoader');

		eventBus.once('error', () => done());

		loader
			.load()
			.catch(done);
	});

	function registerStores(stores) {
		Object.keys(stores).forEach(key => locator.registerInstance('store', stores[key]));
	}

	function createLocator(config) {
		const locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('config', config);
		const eventBus = new events.EventEmitter();
		eventBus.on('error', () => {});
		locator.registerInstance('eventBus', eventBus);
		locator.register('storeLoader', StoreLoader);
		return locator;
	}
});
