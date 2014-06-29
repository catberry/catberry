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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	Logger = require('../mocks/Logger'),
	UniversalMock = require('../mocks/UniversalMock'),
	EventRouter = require('../../lib/client/EventRouter'),
	ServiceLocator = require('catberry-locator');

describe('client/EventRouter', function () {
	describe('#route', function () {

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
					assert.strictEqual(args[0], 'testEvent',
						'Wrong event name');
					assert.strictEqual(args[1], true);
					assert.strictEqual(Object.keys(args[2]).length, 0);
					done();
				});

				eventRouter.routeHashChange('someTestEvent');
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

				var first = function () {
					modules.module.implementation.once('handle',
						function (args) {
							assert.strictEqual(args[0], 'testEvent',
								'Wrong event name');
							assert.strictEqual(args[1], true);
							assert.strictEqual(args[2].number, '1');
							args[3]();
							second();
						});
					eventRouter.routeHashChange('someTestEvent1');
				};

				var second = function () {
					modules.module.implementation.once('handle',
						function (args) {
							assert.strictEqual(args[0], 'testEvent',
								'Wrong event name');
							assert.strictEqual(args[1], false);
							assert.strictEqual(args[2].number, '1');
							third();
							args[3]();
						});
					eventRouter.routeHashChange('someTestEvent2');
				};

				var third = function () {
					modules.module.implementation.once('handle',
						function (args) {
							assert.strictEqual(args[0], 'testEvent',
								'Wrong event name');
							assert.strictEqual(args[1], true);
							assert.strictEqual(args[2].number, '2');
							args[3]();
							done();
						});
				};

				first();
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

				var first = function () {
					modules.module.implementation.once('handle',
						function (args) {
							assert.strictEqual(args[0], 'testEvent',
								'Wrong event name');
							assert.strictEqual(args[1], true);
							assert.strictEqual(Object.keys(args[2]).length, 0);
							second();
							args[3]();
						});
					eventRouter.routeHashChange('someTestEvent');
				};
				var second = function () {
					modules.module.implementation.once('handle',
						function (args) {
							assert.strictEqual(args[0], 'testEvent',
								'Wrong event name');
							assert.strictEqual(args[1], false);
							assert.strictEqual(Object.keys(args[2]).length, 0);
							done();
						});
					eventRouter.routeHashChange(undefined);
				};
				first();
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

				eventRouter.routeHashChange(undefined);
				setTimeout(done, 100);
			});

		it('should send event start to several modules',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();
				locator.registerInstance('eventDefinition',
					'someTestEvent:number->testEvent[module, module2]');
				var eventRouter = locator.resolveInstance(EventRouter),
					counter = 0;

				modules.module2.implementation.once('handle', function (args) {
					assert.strictEqual(args[0], 'testEvent',
						'Wrong event name');
					assert.strictEqual(args[1], true);
					assert.strictEqual(args[2].number, '1');
					if (++counter === 2) {
						done();
					}
					args[3]();
				});
				modules.module.implementation.once('handle', function (args) {
					assert.strictEqual(args[0], 'testEvent',
						'Wrong event name');
					assert.strictEqual(args[1], true);
					assert.strictEqual(args[2].number, '1');
					if (++counter === 2) {
						done();
					}
					args[3]();
				});
				eventRouter.routeHashChange('someTestEvent1');
			});
	});
});

function createLocator() {
	var modules = {
			module: {
				name: 'module',
				implementation: new UniversalMock(['handle'])
			},
			module2: {
				name: 'module2',
				implementation: new UniversalMock(['handle'])
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
	locator.register('logger', Logger);
	return locator;
}