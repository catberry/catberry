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
	util = require('util'),
	Logger = require('../mocks/Logger'),
	EventRouter = require('../../lib/client/EventRouter'),
	EventEmitter = require('events').EventEmitter,
	ServiceLocator = require('../../lib/ServiceLocator'),
	ModuleLoader = require('../mocks/ModuleLoader');

util.inherits(Module, EventEmitter);
function Module() {
	EventEmitter.call(this);
}
Module.prototype.handle = function (eventName, callback) {
	var self = this;
	setImmediate(function () {
		self.emit('handle', eventName);
		callback();
	});
};

describe('client/EventRouter', function () {
	describe('#route', function () {
		it('should route event start to module',
			routeCase1);
		it('should route event end to module when new event is coming',
			routeCase2);
		it('should route event end when new event name is "undefined"',
			routeCase3);
		it('should do nothing if previous and new event is "undefined"',
			routeCase4);
		it('should send broadcast event start to all modules', routeCase5);
		it('should send event end after broadcast event is changed by broadcast',
			routeCase6);
		it('should send event end after broadcast event is changed by module event',
			routeCase7);
	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger, config);
	locator.register('moduleLoader', ModuleLoader, config);
	return locator;
}

function createModules() {
	return {
		module: {
			name: 'module',
			implementation: new Module()
		},
		module2: {
			name: 'module2',
			implementation: new Module()
		}
	};
}

/**
 * Checks case when router should send event start to module.
 * @param {Function} done Mocha done function.
 */
function routeCase1(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter);
	modules.module2.implementation.once('handle', function () {
		assert.fail('Second module should not receive anything');
	});
	modules.module.implementation.once('handle', function (eventName) {
		assert.deepEqual(eventName, 'testEvent',
			'Wrong event name');
		done();
	});
	eventRouter.route('module_testEvent');
}

/**
 * Checks case when router should send event end when new event is starting.
 * @param {Function} done Mocha done function.
 */
function routeCase2(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter);
	modules.module2.implementation.once('handle', function () {
		assert.fail('Second module should not receive anything');
	});
	modules.module.implementation.once('handle', function (eventName1) {
		assert.deepEqual(eventName1, 'testEvent1',
			'Wrong event name');
		modules.module.implementation.once('handle', function (eventName2) {
			assert.deepEqual(eventName2, '!testEvent1',
				'Wrong event name');
			modules.module.implementation.once('handle', function (eventName3) {
				assert.deepEqual(eventName3, 'testEvent2',
					'Wrong event name');
				done();
			});
		});
		eventRouter.route('module_testEvent2');
	});
	eventRouter.route('module_testEvent1');
}

/**
 * Checks case when router should send event end when new event name is "undefined".
 * @param {Function} done Mocha done function.
 */
function routeCase3(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter);
	modules.module2.implementation.once('handle', function () {
		assert.fail('Second module should not receive anything');
	});
	modules.module.implementation.once('handle', function (eventName1) {
		assert.deepEqual(eventName1, 'testEvent1',
			'Wrong event name');
		modules.module.implementation.once('handle', function (eventName2) {
			assert.deepEqual(eventName2, '!testEvent1',
				'Wrong event name');
			done();
		});
		eventRouter.route(undefined);
	});
	eventRouter.route('module_testEvent1');
}

/**
 * Checks case when router should do nothing
 * if previous and new event is "undefined.
 * @param {Function} done Mocha done function.
 */
function routeCase4(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter);
	modules.module.implementation.once('handle', function () {
		assert.fail('Should not do anything');
	});
	modules.module2.implementation.once('handle', function () {
		assert.fail('Should not do anything');
	});
	eventRouter.route(undefined);
	setTimeout(done, 100);
}

/**
 * Checks case when router should send event start to all modules
 * when event is a broadcast.
 * @param {Function} done Mocha done function.
 */
function routeCase5(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter),
		counter = 0;

	modules.module2.implementation.once('handle', function (eventName) {
		assert.deepEqual(eventName, 'testEvent',
			'Wrong event name');
		if (++counter === 2) {
			done();
		}
	});
	modules.module.implementation.once('handle', function (eventName) {
		assert.deepEqual(eventName, 'testEvent',
			'Wrong event name');
		if (++counter === 2) {
			done();
		}
	});
	eventRouter.route('testEvent');
}

/**
 * Checks case when router should send event end to each module
 * when it is changed by another broadcast event.
 * @param {Function} done Mocha done function.
 */
function routeCase6(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter),
		counter = 0;

	modules.module2.implementation.once('handle', function (eventName1) {
		assert.deepEqual(eventName1, 'testEvent1',
			'Wrong event name');
		modules.module2.implementation.once('handle', function (eventName2) {
			assert.deepEqual(eventName2, '!testEvent1',
				'Wrong event name');
			if (++counter === 2) {
				done();
			}
		});
		if (++counter === 2) {
			counter = 0;
			eventRouter.route('testEvent2');
		}
	});
	modules.module.implementation.once('handle', function (eventName1) {
		assert.deepEqual(eventName1, 'testEvent1',
			'Wrong event name');
		modules.module.implementation.once('handle', function (eventName2) {
			assert.deepEqual(eventName2, '!testEvent1',
				'Wrong event name');

			if (++counter === 2) {
				done();
			}
		});
		if (++counter === 2) {
			counter = 0;
			eventRouter.route('testEvent2');
		}
	});
	eventRouter.route('testEvent1');
}

/**
 * Checks case when router should send event end to module
 * when broadcast event is changed by another moduel-specified event.
 * @param {Function} done Mocha done function.
 */
function routeCase7(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		eventRouter = locator.resolveInstance(EventRouter),
		counter = 0;

	modules.module2.implementation.once('handle', function (eventName1) {
		assert.deepEqual(eventName1, 'testEvent1',
			'Wrong event name');
		modules.module2.implementation.once('handle', function (eventName2) {
			assert.deepEqual(eventName2, '!testEvent1',
				'Wrong event name');
			if (++counter === 2) {
				done();
			}
		});
		eventRouter.route('module2_testEvent2');
	});
	modules.module.implementation.once('handle', function (eventName1) {
		assert.deepEqual(eventName1, 'testEvent1',
			'Wrong event name');
		modules.module.implementation.once('handle', function (eventName2) {
			assert.deepEqual(eventName2, '!testEvent1',
				'Wrong event name');

			if (++counter === 2) {
				done();
			}
		});
		eventRouter.route('module_testEvent3');
	});
	eventRouter.route('testEvent1');
}