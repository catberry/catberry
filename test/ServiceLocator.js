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
	ServiceLocator = require('../lib/ServiceLocator');

function Constructor($testModule1, testArgument1, $testModule2, testArgument2,
	$testModule3) {
	this.args = arguments;
}

function TestModule1($testModule2, testArgument1) {
	this.args = arguments;
}

function TestModule2($testModule3, testArgument1, $testModule4) {
	this.args = arguments;
}

function TestModule3(testArgument1) {
	this.args = arguments;
}

function TestModule4() {
	this.args = arguments;
}

describe('ServiceLocator', function () {

	describe('#register', function () {
		it('should throw error if specified type is not a string', function () {
			var locator = new ServiceLocator();
			assert.throws(function () {
				locator.register(null, function () {});
			}, Error);
		});

		it('should throw error if specified constructor is not a function',
			function () {
				var locator = new ServiceLocator();

				assert.throws(function () {
					locator.register('typeName', null);
				}, Error);
			});
	});

	describe('#unregister', function () {
		it('should remove all registration of specified type', function () {
			var locator = new ServiceLocator();
			locator.register('type', function () {});
			locator.registerInstance('type', {});
			locator.unregister('type');

			assert.throws(function () {
				locator.resolve('type');
			});
		});
	});

	describe('#registerInstance', function () {
		it('should register single instance for type', function () {
			var locator = new ServiceLocator();
			var instance = {};
			var instance2 = {};
			locator.registerInstance('type', instance);
			locator.registerInstance('type', instance2);
			var resolved = locator.resolve('type');
			var resolved2 = locator.resolve('type');
			assert.strictEqual(resolved, instance2);
			assert.strictEqual(resolved2, instance2);

			var resolvedAll = locator.resolveAll('type');
			assert.strictEqual(resolvedAll.length, 2);
			assert.strictEqual(resolvedAll[0], instance2);
			assert.strictEqual(resolvedAll[1], instance);
		});
	});

	describe('#resolve', function () {

		it('should resolve all registered modules', function () {
			var locator = new ServiceLocator();
			var rootParameters = {
				testArgument1: 'Constructor.testArgument1',
				testArgument2: 'Constructor.testArgument2'
			};
			var module1Parameters = {
				testArgument1: 'TestModule1.testArgument1'
			};
			var module2Parameters = {
				testArgument1: 'TestModule2.testArgument1'
			};
			var module3Parameters = {
				testArgument1: 'TestModule3.testArgument1'
			};
			locator.register('root', Constructor, rootParameters);
			locator.register('testModule1', TestModule1, module1Parameters);
			locator.register('testModule2', TestModule2, module2Parameters);
			locator.register('testModule3', TestModule3, module3Parameters);
			locator.register('testModule4', TestModule4);

			var rootModule = locator.resolve('root');
			assert.equal(rootModule instanceof Constructor, true,
				'Wrong type resolution');
			assert.equal(rootModule.args[0] instanceof TestModule1, true,
				'Wrong type resolution');
			assert.equal(rootModule.args[1], rootParameters.testArgument1,
				'Wrong parameter resolution');
			assert.equal(rootModule.args[2] instanceof TestModule2, true,
				'Wrong type resolution');
			assert.equal(rootModule.args[3], rootParameters.testArgument2,
				'Wrong parameter resolution');
			assert.equal(rootModule.args[4] instanceof TestModule3, true,
				'Wrong type resolution');

			// TestModule1
			assert.equal(rootModule.args[0].args[0] instanceof TestModule2,
				true,
				'Wrong type resolution');
			assert.equal(rootModule.args[0].args[1],
				module1Parameters.testArgument1,
				'Wrong parameter resolution');

			// TestModule2
			assert.equal(rootModule.args[2].args[0] instanceof TestModule3,
				true,
				'Wrong type resolution');
			assert.equal(rootModule.args[2].args[1],
				module2Parameters.testArgument1,
				'Wrong parameter resolution');
			assert.equal(rootModule.args[2].args[2] instanceof TestModule4,
				true,
				'Wrong type resolution');

			// TestModule3
			assert.equal(rootModule.args[4].args[0],
				module3Parameters.testArgument1,
				'Wrong parameter resolution');

			//TestModule4
			assert.equal(rootModule.args[2].args[2].args.length, 0,
				'Wrong argument count');
		});

		it('should throw error if specified type was not found', function () {
			var locator = new ServiceLocator();
			assert.throws(function () {
				locator.resolve('not exists');
			}, Error);
		});

		it('should throw error if specified type is not a string', function () {
			var locator = new ServiceLocator();
			assert.throws(function () {
				locator.resolve(null);
			}, Error);
		});

		it('should return different instances each time',
			function () {
				var locator = new ServiceLocator();
				locator.register('type', function () {}, {});

				var instance1 = locator.resolve('type');
				var instance2 = locator.resolve('type');

				assert.notEqual(instance1, instance2);
			});

		it('should return the same instance each time if it is as singleton',
			function () {
				var locator = new ServiceLocator();
				locator.register('type', function () {}, {}, true);

				var instance1 = locator.resolve('type');
				var instance2 = locator.resolve('type');

				assert.equal(instance1, instance2);
			});

		it('should resolve unspecified parameters as undefined', function () {
			var locator = new ServiceLocator();
			locator.register('type', function (test) {
				assert.strictEqual(test, undefined);
			});

			var instance = locator.resolve('type');
		});
	});

	describe('#resolveAll', function () {
		it('should resolve all registered implementations of type',
			function () {
				var locator = new ServiceLocator();

				function Implementation1() {

				}

				function Implementation2() {

				}

				function Implementation3() {

				}

				function AnotherImplementation() {

				}

				locator.register('type', Implementation1);
				locator.register('type', Implementation2);
				locator.register('type', Implementation3);
				locator.register('anotherType', AnotherImplementation);

				var instances = locator.resolveAll('type');
				assert.equal(instances.length, 3, 'Wrong instance count');
				assert.equal(instances[0] instanceof Implementation3, true,
					'Wrong type resolution');
				assert.equal(instances[1] instanceof Implementation2, true,
					'Wrong type resolution');
				assert.equal(instances[2] instanceof Implementation1, true,
					'Wrong type resolution');

			});

		it('should return empty array if specified type was not found',
			function () {
				var locator = new ServiceLocator(),
					resolved = locator.resolveAll('not exists');

				assert.strictEqual(resolved instanceof Array, true);
				assert.strictEqual(resolved.length, 0);
			});

		it('should throw error if specified type is not a string', function () {
			var locator = new ServiceLocator();
			assert.throws(function () {
				locator.resolveAll(null);
			}, Error);
		});
	});

	describe('#resolveInstance', function () {
		it('should resolve instance of specified constructor and parameters',
			function () {
				var locator = new ServiceLocator();
				var testArgument = 'testArgumentValue';

				function TestModule() {

				}

				function ModuleToResolve($testType, testArgument) {
					assert.equal($testType instanceof  TestModule, true);
					assert.strictEqual(testArgument, testArgument);
				}

				locator.register('testType', TestModule);
				var instance = locator.resolveInstance(ModuleToResolve, {
					testArgument: testArgument
				});

				assert.equal(instance instanceof ModuleToResolve, true);
			});
	});
});