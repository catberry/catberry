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
	DataStore = require('../mocks/stores/DataStore'),
	DataAsyncStore = require('../mocks/stores/DataAsyncStore'),
	ErrorStore = require('../mocks/stores/ErrorStore'),
	ErrorAsyncStore = require('../mocks/stores/ErrorAsyncStore'),
	ServiceLocator = require('catberry-locator'),
	StoreDispatcher = require('../../lib/StoreDispatcher');

describe('lib/StoreDispatcher', function () {
	describe('#getStoreData', function () {
		it('should properly get store data', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataStore
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (data) {
					assert.strictEqual(data.name, stores.store1.name);
					assert.strictEqual(data.hello, context.hello);
					done();
				})
				.catch(done);
		});
		it('should pass error from store', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: ErrorStore
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function () {
					done(new Error('Should fail'));
				})
				.catch(function (reason) {
					assert.strictEqual(reason.message, stores.store1.name);
					done();
				});
		});
		it('should pass error from store asynchronously', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: ErrorAsyncStore
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function () {
					done(new Error('Should fail'));
				})
				.catch(function (reason) {
					assert.strictEqual(reason.message, stores.store1.name);
					done();
				});
		});
		it('should properly get store data asynchronously', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataAsyncStore
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (data) {
					assert.strictEqual(data.name, stores.store1.name);
					assert.strictEqual(data.hello, context.hello);
					done();
				})
				.catch(done);
		});
		it('should return null if store name is not a string', function (done) {
			var locator = createLocator({}),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(100500)
				.then(function (data) {
					assert.strictEqual(data, null);
					done();
				})
				.catch(done);
		});
		it('should reject promise if there is no such store', function (done) {
			var locator = createLocator({}),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData('wrong')
				.then(function () {
					done(new Error('Should fail'));
				})
				.catch(function (reason) {
					assert.strictEqual(
						reason.message, 'Store "wrong" not found'
					);
					done();
				});
		});
		it('should not invoke store\'s load method ' +
		'many times concurrently', function (done) {
			var counter = 0;
			function Store() {}
			Store.prototype.load = function () {
				counter++;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill('hello');
					}, 10);
				});
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			Promise.all([
				dispatcher.getStoreData(stores.store1.name),
				dispatcher.getStoreData(stores.store1.name),
				dispatcher.getStoreData(stores.store1.name),
				dispatcher.getStoreData(stores.store1.name),
				dispatcher.getStoreData(stores.store1.name)
			])
				.then(function (results) {
					assert.strictEqual(counter, 1);
					results.forEach(function (result) {
						assert.strictEqual(result, 'hello');
					});
					done();
				})
				.catch(done);
		});
		it('should not invoke store\'s load method ' +
		'if store is not changed', function (done) {
			var counter = 0;
			function Store() {}
			Store.prototype.load = function () {
				counter++;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill('hello');
					}, 10);
				});
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (result) {
					assert.strictEqual(result, 'hello');
					return dispatcher.getStoreData(stores.store1.name);
				})
				.then(function (result) {
					assert.strictEqual(counter, 1);
					assert.strictEqual(result, 'hello');
					done();
				})
				.catch(done);
		});
		it('should invoke store\'s load method ' +
		'if store is changed', function (done) {
			var counter = 0;
			function Store() {}
			Store.prototype.load = function () {
				counter++;
				var self = this;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill('hello');
						if (counter === 1) {
							self.$context.changed();
						}
					}, 10);
				});
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				eventBus = locator.resolve('eventBus'),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (result) {
					assert.strictEqual(counter, 1);
					assert.strictEqual(result, 'hello');
				});
			eventBus.on('storeChanged', function (storeName) {
				assert.strictEqual(storeName, stores.store1.name);
				dispatcher.getStoreData(stores.store1.name)
					.then(function (result) {
						assert.strictEqual(counter, 2);
						assert.strictEqual(result, 'hello');
						done();
					})
					.catch(done);
			});
		});
		it('should invoke store\'s load method ' +
		'if store is changed after state changing', function (done) {
			var counter = 0;
			function Store() {}
			Store.prototype.load = function () {
				counter++;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill('hello');
					}, 10);
				});
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				eventBus = locator.resolve('eventBus'),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (result) {
					assert.strictEqual(counter, 1);
					assert.strictEqual(result, 'hello');
					eventBus.on('storeChanged', function (storeName) {
						assert.strictEqual(storeName, stores.store1.name);
						dispatcher.getStoreData(stores.store1.name)
							.then(function (result) {
								assert.strictEqual(counter, 2);
								assert.strictEqual(result, 'hello');
								done();
							})
							.catch(done);
					});
					dispatcher.setState({store1: {}}, context);
				});
		});
		it('should not cache store\'s data ' +
		'if there was an error loading data', function (done) {
			var counter = 0;
			function Store() {}
			Store.prototype.load = function () {
				counter++;
				if (counter === 1) {
					throw new Error('error');
				}
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill('hello');
					}, 10);
				});
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.catch(function (error) {
					assert.strictEqual(error.message, 'error');
					return dispatcher.getStoreData(stores.store1.name);
				})
				.then(function (result) {
					assert.strictEqual(counter, 2);
					assert.strictEqual(result, 'hello');
					done();
				})
				.catch(done);
		});
		it('should cache store\'s data ' +
		'only for it\'s lifetime', function (done) {
			var counter = 0;
			function Store() {
				this.$lifetime = 50;
			}
			Store.prototype.load = function () {
				counter++;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill('hello' + counter);
					}, 10);
				});
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (data) {
					assert.strictEqual(data, 'hello1');
					return new Promise(function (fulfill) {
						setTimeout(function () {
							fulfill();
						}, 100);
					});
				})
				.then(function () {
					return dispatcher.getStoreData(stores.store1.name);
				})
				.then(function (result) {
					assert.strictEqual(counter, 2);
					assert.strictEqual(result, 'hello2');
					done();
				})
				.catch(done);
		});
		it('should reject promise when initial state ' +
		'is not state', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataStore
				}
			};
			var locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.getStoreData(stores.store1.name)
				.then(function () {
					done(new Error('Should fail'));
				})
				.catch(function (reason) {
					assert.strictEqual(
						reason.message, 'State should be set before any request'
					);
					done();
				});
		});
	});
	describe('#setState', function () {
		it('should set initial state and return empty array', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataStore
				},
				store2: {
					name: 'store2',
					constructor: DataStore
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				eventBus = locator.resolve('eventBus'),
				dispatcher = locator.resolve('storeDispatcher');

			var names = dispatcher.setState({}, context);
			assert.strictEqual(names.length, 0);
			done();
		});
		it('should return names of changed stores', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataStore
				},
				store2: {
					name: 'store2',
					constructor: DataStore
				},
				store3: {
					name: 'store3',
					constructor: DataStore
				},
				store4: {
					name: 'store4',
					constructor: DataStore
				},
				store5: {
					name: 'store5',
					constructor: DataStore
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				eventBus = locator.resolve('eventBus'),
				dispatcher = locator.resolve('storeDispatcher');

			var initState = {
				// to remove
				store1: {
					some: 'value'
				},
				// to change value
				store2: {
					some1: 'value1',
					some2: 2
				},
				// to change count of properties
				store3: {
					some1: 'value1',
					some2: 2,
					some3: true
				},
				// to keep the same
				store4: {
					some: 'value'
				}
				// store5 is absent at all
			};

			var newState = {
				store2: {
					some1: 'value2',
					some2: 1
				},
				store3: {
					some1: 'value1',
					some2: 3
				},
				store4: {
					some: 'value'
				},
				store5: {
					some: 'value'
				}
			};
			var names = dispatcher.setState(initState, context);
			assert.strictEqual(names.length, 0);
			dispatcher.getStoreData(stores.store2.name)
				.then(function () {
					var newContext = {hello: 'world2'},
						updatedNames = dispatcher.setState(
							newState, newContext
						);
					assert.strictEqual(updatedNames.length, 4);
					assert.deepEqual(updatedNames, [
						'store1', 'store2', 'store3', 'store5'
					]);
					done();
				});
		});
	});
});

function createLocator(stores, config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.registerInstance('config', config || {});
	locator.registerInstance('storeLoader', {
		load: function () {
			return Promise.resolve(stores);
		},
		getStoresByNames: function () {
			return stores;
		}
	});
	locator.register('storeDispatcher', StoreDispatcher);
	return locator;
}