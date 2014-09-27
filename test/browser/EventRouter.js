/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
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
	Logger = require('../mocks/Logger'),
	UniversalMock = require('../mocks/UniversalMock'),
	EventRouter = require('../../browser/EventRouter'),
	ServiceLocator = require('catberry-locator');

global.Promise = require('promise');

describe('browser/EventRouter', function () {
	describe('#routeEvent', function () {
		it('should not send event to modules without event definitions',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Module should not receive anything');
				});
				modules.module.implementation.once('handle', function () {
					assert.fail('Module should not receive anything');
				});

				eventRouter.routeEvent({
					string: 'someTestEvent',
					isEnding: false,
					isHashChanging: false,
					element: {}
				})
					.then(function () {
						done();
					},
					function (error) {
						done(error);
					});
			});

		it('should not send event to modules without correct module names',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[wrong,wrong2]');

				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Module should not receive anything');
				});
				modules.module.implementation.once('handle', function () {
					assert.fail('Module should not receive anything');
				});

				eventRouter.routeEvent({
					string: 'someTestEvent',
					isEnding: false,
					isHashChanging: false,
					element: {}
				})
					.then(function () {
						done();
					},
					function (error) {
						done(error);
					});
			});
		it('should does nothing if event name is not an event definition',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[wrong,wrong2]');

				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Module should not receive anything');
				});
				modules.module.implementation.once('handle', function () {
					assert.fail('Module should not receive anything');
				});

				eventRouter.routeEvent({
					string: 'someWrongEvent',
					isEnding: false,
					isHashChanging: false,
					element: {}
				})
					.then(function () {
						done();
					},
					function (error) {
						done(error);
					});
			});

		it('should handle error and return via promise',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[module]');

				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module.implementation.decorateMethod('handle',
					function () {
						throw new Error('hello');
					});

				eventRouter.routeEvent({
					string: 'someTestEvent',
					isEnding: false,
					isHashChanging: false,
					element: {}
				})
					.then(function () {
						assert.fail();
					},
					function (error) {
						assert.strictEqual(error.message, 'hello');
					})
					.then(function () {
						done();
					}, function (error) {
						done(error);
					});
			});
		it('should suppress error in after method',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[module]');

				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module.implementation.decorateMethod('afterHandle',
					function () {
						throw new Error('hello');
					});

				var eventBus = locator.resolve('eventBus');
				eventBus.once('error', function (error) {
					assert.strictEqual(error.message, 'hello');
					done();
				});
				eventRouter.routeEvent({
					string: 'someTestEvent',
					isEnding: false,
					isHashChanging: false,
					element: {}
				})
					.then(null, function (error) {
						done(error);
					});
			});

		it('should filter wrong event definitions',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition', '');

				var eventRouter = locator.resolveInstance(EventRouter);
				assert.strictEqual(eventRouter._eventMappers.length, 0);
				done();
			});
	});
	describe('#routeDataEvent', function () {
		it('should route data event to module',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[module]');
				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Second module should not receive anything');
				});
				modules.module.implementation.once('handle', function (args) {
					var eventName = args[0],
						event = args[1];
					assert.strictEqual(
						eventName, 'testEvent', 'Wrong event name'
					);
					assert.strictEqual(
						event.name, 'testEvent', 'Wrong event name'
					);
					assert.strictEqual(
						event.string, 'someTestEvent', 'Wrong event name'
					);
					assert.strictEqual(event.isEnding, false);
					assert.strictEqual(event.isHashChanging, false);
					assert.strictEqual(Object.keys(event.args).length, 0);
				});

				eventRouter.routeDataEvent('someTestEvent', {})
					.then(function () {
						done();
					},
					function (error) {
						done(error);
					});
			});

	});
	describe('#routeHashChange', function () {

		it('should route event start to module',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[module]');
				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Second module should not receive anything');
				});
				modules.module.implementation.once('handle', function (args) {
					var eventName = args[0],
						event = args[1];
					assert.strictEqual(
						eventName, 'testEvent', 'Wrong event name'
					);
					assert.strictEqual(
						event.name, 'testEvent', 'Wrong event name'
					);
					assert.strictEqual(
						event.string, 'someTestEvent', 'Wrong event name'
					);
					assert.strictEqual(event.isEnding, false);
					assert.strictEqual(event.isHashChanging, true);
					assert.strictEqual(Object.keys(event.args).length, 0);
				});

				eventRouter.routeHashChange('someTestEvent')
					.then(function () {
						done();
					},
					function (error) {
						done(error);
					});
			});

		it('should route event end to module when new event is coming',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();
				locator.registerInstance('eventDefinition',
					'someTestEvent:number->testEvent[module]');
				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Second module should not receive anything');
				});

				var nameValidator = function (eventName, event) {
					assert.strictEqual(
						eventName, 'testEvent', 'Wrong event name'
					);
					assert.strictEqual(
						event.name, 'testEvent', 'Wrong event name'
					);
				};

				Promise.resolve()
					.then(function () {
						modules.module.implementation.once('handle',
							function (args) {
								var eventName = args[0],
									event = args[1];

								nameValidator(eventName, event);
								assert.strictEqual(event.isEnding, false);
								assert.strictEqual(event.isHashChanging, true);
								assert.strictEqual(event.args.number, '1');
							});
						return eventRouter.routeHashChange('someTestEvent1');
					})
					.then(function () {
						modules.module.implementation.once('handle',
							function (args) {
								var eventName = args[0],
									event = args[1];

								nameValidator(eventName, event);
								assert.strictEqual(event.isEnding, true);
								assert.strictEqual(event.isHashChanging, true);
								assert.strictEqual(event.args.number, '1');
							});
						return eventRouter.routeHashChange('someTestEvent2');
					})
					.then(function () {
						modules.module.implementation.once('handle',
							function (args) {
								var eventName = args[0],
									event = args[1];

								nameValidator(eventName, event);
								assert.strictEqual(event.isEnding, false);
								assert.strictEqual(event.isHashChanging, true);
								assert.strictEqual(event.args.number, '2');
							});
					})
					.then(function () {
						done();
					}, function (error) {
						done(error);
					});
			});

		it('should route event end when new event name is "undefined"',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();
				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[module]');
				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module2.implementation.once('handle', function () {
					assert.fail('Second module should not receive anything');
				});

				var nameValidator = function (eventName, event) {
					assert.strictEqual(
						eventName, 'testEvent', 'Wrong event name'
					);
					assert.strictEqual(
						event.name, 'testEvent', 'Wrong event name'
					);
				};

				Promise.resolve()
					.then(function () {
						modules.module.implementation.once('handle',
							function (args) {
								var eventName = args[0],
									event = args[1];

								nameValidator(eventName, event);
								assert.strictEqual(event.isEnding, false);
								assert.strictEqual(event.isHashChanging, true);
								assert.strictEqual(
									Object.keys(event.args).length, 0
								);
							});
						return eventRouter.routeHashChange('someTestEvent');
					})
					.then(function () {
						modules.module.implementation.once('handle',
							function (args) {
								var eventName = args[0],
									event = args[1];

								nameValidator(eventName, event);
								assert.strictEqual(event.isEnding, true);
								assert.strictEqual(event.isHashChanging, true);
								assert.strictEqual(
									Object.keys(event.args).length, 0
								);
							});
						return eventRouter.routeHashChange(undefined);
					})
					.then(function () {
						done();
					}, function (error) {
						done(error);
					});
			});

		it('should do nothing if previous and new event is "undefined"',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();
				locator.registerInstance('eventDefinition',
					'someTestEvent->testEvent[module]');
				var eventRouter = locator.resolveInstance(EventRouter);

				modules.module.implementation.once('handle', function () {
					assert.fail('Should not do anything');
				});

				modules.module2.implementation.once('handle', function () {
					assert.fail('Should not do anything');
				});

				eventRouter.routeHashChange(undefined)
					.then(function () {
						done();
					}, function (error) {
						done(error);
					});
			});

		it('should send event start to several modules',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();
				locator.registerInstance('eventDefinition',
					'someTestEvent:number->testEvent[module, module2]');
				var eventRouter = locator.resolveInstance(EventRouter),
					invoked = {},
					validator = function (moduleName, args) {
						var eventName = args[0],
							event = args[1];

						assert.strictEqual(
							eventName, 'testEvent', 'Wrong event name'
						);
						assert.strictEqual(
							event.name, 'testEvent', 'Wrong event name'
						);
						assert.strictEqual(event.isEnding, false);
						assert.strictEqual(event.isHashChanging, true);
						assert.strictEqual(event.args.number, '1');
						if (!(moduleName in invoked)) {
							invoked[moduleName] = 0;
						}
						invoked[moduleName]++;
					};

				modules.module.implementation.once(
					'handle',
					validator.bind(modules.module.implementation, 'module')
				);
				modules.module2.implementation.once(
					'handle',
					validator.bind(modules.module2.implementation, 'module2')
				);

				eventRouter.routeHashChange('someTestEvent1')
					.then(function () {
						assert.strictEqual(invoked.module, 1);
						assert.strictEqual(invoked.module2, 1);
						done();
					}, function (error) {
						done(error);
					});
			});

		it('should invoke after methods in several modules',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();
				locator.registerInstance(
					'eventDefinition',
					'someTestEvent:number->testEvent[module, module2]'
				);
				var eventRouter = locator.resolveInstance(EventRouter),
					invoked = {},
					handleInvoked = 0,
					validator = function (moduleName, args) {
						var eventName = args[0],
							event = args[1];

						assert.strictEqual(handleInvoked, 2);
						assert.strictEqual(
							eventName, 'testEvent', 'Wrong event name'
						);
						assert.strictEqual(
							event.name, 'testEvent', 'Wrong event name'
						);
						assert.strictEqual(event.isEnding, false);
						assert.strictEqual(event.isHashChanging, true);
						assert.strictEqual(event.args.number, '1');
						if (!(moduleName in invoked)) {
							invoked[moduleName] = 0;
						}
						invoked[moduleName]++;
					};

				modules.module.implementation.once('handle', function () {
					handleInvoked++;
				});
				modules.module2.implementation.once('handle', function () {
					handleInvoked++;
				});
				modules.module.implementation.once(
					'afterHandle',
					validator.bind(modules.module.implementation, 'module')
				);
				modules.module2.implementation.once(
					'afterHandle',
					validator.bind(modules.module2.implementation, 'module2')
				);

				eventRouter.routeHashChange('someTestEvent1')
					.then(function () {
						assert.strictEqual(invoked.module, 1);
						assert.strictEqual(invoked.module2, 1);
						done();
					}, function (error) {
						done(error);
					});
			});
	});
});

function createLocator() {
	var modules = {
			module: {
				name: 'module',
				implementation: new UniversalMock(['handle', 'afterHandle'])
			},
			module2: {
				name: 'module2',
				implementation: new UniversalMock(['handle', 'afterHandle'])
			}
		},
		locator = new ServiceLocator(),
		moduleLoader = {
			getModulesByNames: function () {
				return modules;
			}
		};
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('moduleLoader', moduleLoader);
	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.register('logger', Logger);
	return locator;
}