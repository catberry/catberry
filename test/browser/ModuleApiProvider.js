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
	UniversalMock = require('../mocks/UniversalMock'),
	ServiceLocator = require('catberry-locator'),
	ModuleApiProvider = require('../../browser/ModuleApiProvider');

global.Promise = require('promise');

describe('lib/ModuleApiProvider', function () {
	describe('#redirect', function () {
		it('should redirect to URL', function (done) {
			var locator = createLocator(),
				api = locator.resolveInstance(ModuleApiProvider),
				requestRouter = locator.resolve('requestRouter');
			requestRouter.on('go', function (args) {
				assert.strictEqual(args[0], '/some1');
				done();
			});
			assert.strictEqual(api.redirect('/some1') instanceof Promise, true);
		});
	});
	describe('#clearHash', function () {
		it('should clear URL hash', function (done) {
			var locator = createLocator(),
				api = locator.resolveInstance(ModuleApiProvider),
				requestRouter = locator.resolve('requestRouter');
			requestRouter.on('clearHash', function (args) {
				assert.strictEqual(args.length, 0);
				done();
			});
			assert.strictEqual(api.clearHash() instanceof Promise, true);
		});
	});
	describe('#requestRefresh', function () {
		it('should requests render and not reset hash',
			function () {
				var locator = createLocator(),
					api = locator.resolveInstance(ModuleApiProvider),
					requestRouter = locator.resolve('requestRouter'),
					rendered = false,
					cleared = false;
				requestRouter.on('requestRender', function () {
					rendered = true;
				});
				requestRouter.on('clearHash', function () {
					cleared = true;
				});
				assert.strictEqual(
						api.requestRefresh('some', 'placeholder') instanceof
						Promise,
					true
				);
				assert.strictEqual(rendered, true);
				assert.strictEqual(cleared, false);
			});
		it('should requests render and reset hash when it is set',
			function (done) {
				var locator = createLocator(),
					api = locator.resolveInstance(ModuleApiProvider),
					requestRouter = locator.resolve('requestRouter'),
					window = locator.resolve('window'),
					rendered = false;
				window.location.hash = 'some';
				requestRouter.on('requestRender', function () {
					rendered = true;
				});
				requestRouter.on('clearHash', function (args) {
					assert.strictEqual(rendered, true);
					assert.strictEqual(args.length, 0);
					done();
				});
				assert.strictEqual(
						api.requestRefresh('some', 'placeholder') instanceof
						Promise,
					true
				);
			});
	});
	describe('#requestRender', function () {
		it('should just return promise', function (done) {
			var locator = createLocator(),
				api = locator.resolveInstance(ModuleApiProvider),
				requestRouter = locator.resolve('requestRouter');
			requestRouter.on('requestRender', function () {
				done();
			});

			assert.strictEqual(
					api.requestRender('some', 'placeholder') instanceof Promise,
				true
			);
		});
	});
	describe('#render', function () {
		it('should just return promise', function (done) {
			var locator = createLocator(),
				api = locator.resolveInstance(ModuleApiProvider),
				templateProvider = locator.resolve('templateProvider');
			templateProvider.on('render', function () {
				done();
			});
			assert.strictEqual(
					api.render('some-template') instanceof Promise, true
			);
		});
	});
});

function createLocator() {
	var locator = new ServiceLocator();

	var requestRouter = new UniversalMock([
		'go', 'clearHash', 'requestRender'
	]);
	requestRouter.decorateMethod('go', function () {
		return Promise.resolve();
	});
	requestRouter.decorateMethod('requestRender', function () {
		return Promise.resolve();
	});
	locator.registerInstance('requestRouter', requestRouter);
	var templateProvider = new UniversalMock(['render']);
	templateProvider.decorateMethod('render', function () {
		return Promise.resolve();
	});
	locator.registerInstance('templateProvider', templateProvider);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('window', {
		location: {
			hash: ''
		}
	});
	locator.registerInstance('eventBus', new events.EventEmitter());

	return locator;
}