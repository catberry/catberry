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
	URI = require('catberry-uri').URI,
	ServiceLocator = require('catberry-locator'),
	StateProvider = require('../../../lib/providers/StateProvider');

global.Promise = require('promise');

describe('lib/providers/StateProvider', function () {
	describe('#getStateByUri', function () {
		it('should return the correct state', function () {
			var routes = [
					'/state/:arg1[Store1, Store2]/:arg2[Store2]' +
					'?arg3=:arg3[Store1]&arg4=:arg4[Store3]'
				],
				locator = createLocator(routes),
				provider = locator.resolveInstance(StateProvider),
				uri = new URI('/state/val1/val2?arg3=val3&arg4=val4');

			var state = provider.getStateByUri(uri);
			assert.strictEqual(state.Store1.arg1, 'val1');
			assert.strictEqual(state.Store2.arg1, 'val1');
			assert.strictEqual(state.Store2.arg2, 'val2');
			assert.strictEqual(state.Store1.arg3, 'val3');
			assert.strictEqual(state.Store3.arg4, 'val4');
		});
		it('should return the alternative state without query', function () {
			var routes = [
					'/state/:arg1[Store1, Store2]/:arg2[Store2]',
					'/state/:arg1[Store1, Store2]/:arg2[Store2]' +
					'?arg3=:arg3[Store1]&arg4=:arg4[Store3]'
				],
				locator = createLocator(routes),
				provider = locator.resolveInstance(StateProvider),
				uri = new URI('/state/val1/val2?none=val3&arg4=val4');

			var state = provider.getStateByUri(uri);
			assert.strictEqual(Object.keys(state).length, 2);
			assert.strictEqual(Object.keys(state.Store1).length, 1);
			assert.strictEqual(state.Store1.arg1, 'val1');
			assert.strictEqual(Object.keys(state.Store2).length, 2);
			assert.strictEqual(state.Store2.arg1, 'val1');
			assert.strictEqual(state.Store2.arg2, 'val2');
		});
	});
});

function createLocator(routeDefinitions) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	routeDefinitions.forEach(function (routeDefinition) {
		locator.registerInstance('routeDefinition', routeDefinition);
	});

	return locator;
}