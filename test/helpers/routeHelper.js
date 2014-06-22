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
	routeHelper = require('../../lib/helpers/routeHelper');

describe('helpers/routeHelper', function () {
	describe('#getMapperByRoute', function () {

		it('should return null if expression is empty', function (done) {
			var mapper = routeHelper.getMapperByRoute(undefined);
			assert.strictEqual(mapper, null);
			mapper = routeHelper.getMapperByRoute(null);
			assert.strictEqual(mapper, null);
			mapper = routeHelper.getMapperByRoute('');
			assert.strictEqual(mapper, null);
			done();
		});

		it('should return correct mapper for parametrized expression',
			function (done) {
				var expression1 = '/:first[  module1,module2,   module3   ]' +
						'/some:postfix[module1, module2]' +
						'/:simple[module1]' +
						'/:prefix[module3]details' +
						'?filter=:filter[module2]' +
						'&:query[module3]=:value[module3]',
					mapper = routeHelper.getMapperByRoute(expression1);

				var testUrl1 = '/firstValue' +
					'/somePostfixValue' +
					'/simpleValue' +
					'/SomePrefixValuedetails' +
					'?filter=byDate' +
					'&someQuery=someValue';

				assert.strictEqual(mapper.expression.test(testUrl1), true);
				var state1 = mapper.map(testUrl1);
				assert.strictEqual(Object.keys(state1).length, 3);

				assert.strictEqual(Object.keys(state1.module1).length, 3);
				assert.strictEqual(state1.module1.first, 'firstValue');
				assert.strictEqual(state1.module1.postfix, 'PostfixValue');
				assert.strictEqual(state1.module1.simple, 'simpleValue');

				assert.strictEqual(Object.keys(state1.module2).length, 3);
				assert.strictEqual(state1.module2.first, 'firstValue');
				assert.strictEqual(state1.module2.postfix, 'PostfixValue');
				assert.strictEqual(state1.module2.filter, 'byDate');

				assert.strictEqual(Object.keys(state1.module3).length, 4);
				assert.strictEqual(state1.module3.first, 'firstValue');
				assert.strictEqual(state1.module3.prefix, 'SomePrefixValue');
				assert.strictEqual(state1.module3.query, 'someQuery');
				assert.strictEqual(state1.module3.value, 'someValue');

				var testUrl2 = '/firstValue' +
					'/somePostfixValue' +
					'/simpleValue' +
					'/SomePrefixValuedetails';

				var state2 = mapper.map(testUrl2);
				assert.strictEqual(typeof(state2), 'object');
				assert.strictEqual(Object.keys(state2).length, 0);

				var expression2 = ':first[module1]' +
						':second[module1,module2]' +
						':third[module3]',
					mapper2 = routeHelper.getMapperByRoute(expression2),
					testUrl3 = 'some';

				assert.strictEqual(mapper2.expression.test(testUrl3), true);
				var state3 = mapper.map(testUrl3);
				assert.strictEqual(typeof(state3), 'object');
				assert.strictEqual(Object.keys(state3).length, 0);

				done();
			});

		it('should return correct mapper for non-parametrized string',
			function (done) {
				var url = '/some/test?filter=date',
					mapper = routeHelper.getMapperByRoute(url);

				assert.strictEqual(mapper.expression.test(url), true);
				var state = mapper.map(url);
				assert.strictEqual(typeof(state), 'object');
				assert.strictEqual(Object.keys(state).length, 0);
				done();
			});
	});
});
