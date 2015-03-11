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
		it('should properly get store data from $context', function (done) {
			function Store1() {}
			Store1.prototype.load = function () {
				return this.$context.getStoreData('store2');
			};
			function Store2() {}
			Store2.prototype.load = function () {
				return 'hello';
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store1
				},
				store2: {
					name: 'store2',
					constructor: Store2
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (data) {
					assert.strictEqual(data, 'hello');
					done();
				})
				.catch(done);
		});
		it('should return null if store name equals ' +
		'current in $context', function (done) {
			function Store1() {}
			Store1.prototype.load = function () {
				return this.$context.getStoreData('store1');
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store1
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			dispatcher.getStoreData(stores.store1.name)
				.then(function (data) {
					assert.strictEqual(data, null);
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
					fulfill('hello');
					setTimeout(function () {
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
		it('should emit store\'s changed ' +
		'for dependant store ', function (done) {
			var loads = [];
			function Store1() {}
			Store1.prototype.load = function () {
				loads.push(this.$context.name);
				var self = this;
				if (loads.length === 1) {
					setTimeout(function () {
						self.$context.changed();
					}, 10);
				}
				return new Promise(function (fulfill) {
					fulfill('hello');
				});
			};
			function Store2() {
				this.$context.setDependency('store1');
			}
			Store2.prototype.load = function () {
				loads.push(this.$context.name);
			};
			function Store3() {
				this.$context.setDependency('store2');
			}
			Store3.prototype.load = function () {
				loads.push(this.$context.name);
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store1
				},
				store2: {
					name: 'store2',
					constructor: Store2
				},
				store3: {
					name: 'store3',
					constructor: Store3
				}
			};
			var locator = createLocator(stores),
				context = {hello: 'world'},
				eventBus = locator.resolve('eventBus'),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, context);
			Promise.all([
				dispatcher.getStoreData(stores.store1.name),
				dispatcher.getStoreData(stores.store2.name),
				dispatcher.getStoreData(stores.store3.name)
			])
				.catch(done);

			eventBus.on('storeChanged', function (storeName) {
				if (storeName !== 'store3') {
					return;
				}
				return Promise.all([
					dispatcher.getStoreData(stores.store1.name),
					dispatcher.getStoreData(stores.store2.name),
					dispatcher.getStoreData(stores.store3.name)
				])
					.then(function () {
						assert.strictEqual(loads[0], 'store1');
						assert.strictEqual(loads[1], 'store2');
						assert.strictEqual(loads[2], 'store3');
						assert.strictEqual(loads[3], 'store1');
						assert.strictEqual(loads[4], 'store2');
						assert.strictEqual(loads[5], 'store3');
						done();
					})
					.catch(done);
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
		'is not set', function (done) {
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

	describe('#sendAction', function () {
		it('should send action to store if it has handler', function (done) {
			function Store() {}
			Store.prototype.handleSomeAction = function (args) {
				return {
					args: args,
					result: 'result'
				};
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var actionParameters = {},
				locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, {});
			dispatcher.sendAction(
				stores.store1.name, 'some-action', actionParameters
			)
				.then(function (result) {
					assert.strictEqual(result.args, actionParameters);
					assert.strictEqual(result.result, 'result');
					done();
				})
				.catch(done);
		});
		it('should send action to store if it has handler', function (done) {
			function Store1() {}
			Store1.prototype.handleHello = function (name) {
				return this.$context.sendAction('store2', 'world', name);
			};
			function Store2() {}
			Store2.prototype.handleWorld = function (name) {
				return 'hello, ' + name;
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store1
				},
				store2: {
					name: 'store2',
					constructor: Store2
				}
			};
			var locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, {});
			dispatcher.sendAction(
				stores.store1.name, 'hello', 'catberry'
			)
				.then(function (result) {
					assert.strictEqual(result, 'hello, catberry');
					done();
				})
				.catch(done);
		});
		it('should response with undefined ' +
		'if there is no such action handler', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataStore
				}
			};
			var actionParameters = {},
				locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, {});
			dispatcher.sendAction(
				stores.store1.name, 'some-action', actionParameters
			)
				.then(function (result) {
					assert.strictEqual(result, undefined);
					done();
				})
				.catch(done);
		});
		it('should pass error from action handler', function (done) {
			function Store() {}
			Store.prototype.handleSomeAction = function () {
				throw new Error('error');
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				}
			};
			var actionParameters = {},
				locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, {});
			dispatcher.sendAction(
				stores.store1.name, 'some-action', actionParameters
			)
				.then(function () {
					done(new Error('Should fail'));
				})
				.catch(function (reason) {
					assert.strictEqual(reason.message, 'error');
					done();
				});
		});
	});
	describe('#sendBroadcastAction', function () {
		it('should send action to all stores with handlers', function (done) {
			function Store() {}
			Store.prototype.handleSomeAction = function (args) {
				return {
					args: args,
					result: this.$context.name
				};
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store
				},
				store2: {
					name: 'store2',
					constructor: DataStore
				},
				store3: {
					name: 'store3',
					constructor: Store
				}
			};
			var actionParameters = {},
				locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, {});
			dispatcher.sendBroadcastAction(
				'some-action', actionParameters
			)
				.then(function (results) {
					assert.strictEqual(results.length, 2);
					assert.strictEqual(results[0].args, actionParameters);
					assert.strictEqual(results[0].result, 'store1');
					assert.strictEqual(results[1].args, actionParameters);
					assert.strictEqual(results[1].result, 'store3');
					done();
				})
				.catch(done);
		});
		it('should send action to all stores ' +
		'with handlers from $context', function (done) {
			function Store1() {}
			Store1.prototype.handleSome = function (name) {
				return this.$context.sendBroadcastAction('action', name);
			};
			function Store2() {}
			Store2.prototype.handleAction = function (name) {
				return 'hello from store2, ' + name;
			};
			function Store3() {}
			Store3.prototype.handleAction = function (name) {
				return 'hello from store3, ' + name;
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: Store1
				},
				store2: {
					name: 'store2',
					constructor: Store2
				},
				store3: {
					name: 'store3',
					constructor: Store3
				}
			};
			var locator = createLocator(stores),
				dispatcher = locator.resolve('storeDispatcher');

			dispatcher.setState({}, {});
			dispatcher.sendAction('store1', 'some', 'catberry')
				.then(function (results) {
					assert.strictEqual(results.length, 2);
					assert.strictEqual(
						results[0], 'hello from store2, catberry'
					);
					assert.strictEqual(
						results[1], 'hello from store3, catberry'
					);
					done();
				})
				.catch(done);
		});
	});
});

function createLocator(stores, config) {
	var locator = new ServiceLocator(),
		eventBus = new events.EventEmitter();
	eventBus.on('error', function () {});
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('eventBus', eventBus);
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