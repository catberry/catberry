'use strict';

const assert = require('assert');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const StoreLoader = require('../../../lib/loaders/StoreLoader');
const ContextFactory = require('../../../lib/ContextFactory');
const ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider');
const CookieWrapper = require('../../../lib/CookieWrapper');
const StoreFinder = require('../../mocks/finders/StoreFinder');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/loaders/StoreLoader', function() {
	it('should properly load stores', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
			}
		};

		const locator = createLocator(stores);
		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				const storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 1);
				const store = loadedStores[storeNames[0]];
				assert.strictEqual(store.name, stores.Test1.name);
				assert.strictEqual(typeof (store.constructor), 'function');
			})
			.then(done)
			.catch(done);
	});

	it('should load nothing if an error occurs', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
			}
		};

		const locator = createLocator(stores, () => done());
		const eventBus = locator.resolve('eventBus');
		const loader = locator.resolve('storeLoader');

		eventBus.on('storeLoaded', () => {
			throw new Error('TestError');
		});

		loader
			.load()
			.then(loadedStores => assert.deepEqual(loadedStores, {}))
			.catch(done);
	});

	it('should properly transform stores', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
			}
		};

		const locator = createLocator(stores);

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
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				const storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 1);
				const store = loadedStores[storeNames[0]];
				assert.strictEqual(store.name, `${stores.Test1.name}!?`);
				assert.strictEqual(typeof (store.constructor), 'function');
			})
			.then(done)
			.catch(done);
	});

	it('should skip transform errors', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
			}
		};

		const locator = createLocator(stores, () => {});

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
			.then(loadedStores => assert.strictEqual(loadedStores['Test1!'].name, 'Test1!'))
			.then(done)
			.catch(done);
	});

	it('should throw error if transform returns a bad result', function(done) {
		const stores = {
			Test1: {
				name: 'Test1',
				path: 'test/cases/lib/loaders/StoreLoader/Test1.js'
			}
		};

		const locator = createLocator(stores, () => done());
		locator.registerInstance('storeTransform', {
			transform: store => null
		});

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.catch(done);
	});

	it('should emit error when constructor is not a function', function(done) {
		const stores = {
			Wrong: {
				name: 'Wrong',
				path: 'test/cases/lib/loaders/StoreLoader/Wrong.js'
			}
		};
		const errorHandler = error => {
			assert.strictEqual(error instanceof Error, true);
			done();
		};
		const locator = createLocator(stores, errorHandler);

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				const storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 0);
			})
			.catch(done);
	});

	it('should emit error when wrong path', function(done) {
		const stores = {
			Wrong: {
				name: 'Wrong',
				path: 'wrong/path'
			}
		};
		const errorHandler = error => {
			assert.strictEqual(error instanceof Error, true);
			done();
		};
		const locator = createLocator(stores, errorHandler);

		const loader = locator.resolve('storeLoader');

		loader
			.load()
			.then(loadedStores => {
				assert.strictEqual(loadedStores, loader.getStoresByNames());
				const storeNames = Object.keys(loadedStores);
				assert.strictEqual(storeNames.length, 0);
			})
			.catch(done);
	});
});

function createLocator(stores, errorHandler) {
	const locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', {isRelease: true});
	const eventBus = new events.EventEmitter();
	if (errorHandler) {
		eventBus.on('error', errorHandler);
	}
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('storeFinder', new StoreFinder(stores));
	locator.register('contextFactory', ContextFactory);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('storeLoader', StoreLoader);
	return locator;
}
