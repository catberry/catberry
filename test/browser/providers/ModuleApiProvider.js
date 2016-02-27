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
	jsdom = require('jsdom'),
	UniversalMock = require('../../mocks/UniversalMock'),
	ServiceLocator = require('catberry-locator'),
	ModuleApiProvider = require('../../../browser/providers/ModuleApiProvider');

global.Promise = require('promise');

describe('browser/providers/ModuleApiProvider', function() {
	describe('#redirect', function() {
		it('should redirect to URI', function(done) {
			var locator = createLocator(),
				api = new ModuleApiProvider(locator),
				requestRouter = locator.resolve('requestRouter');
			requestRouter.on('go', function(args) {
				assert.strictEqual(args[0], '/some1');
				done();
			});
			assert.strictEqual(api.redirect('/some1') instanceof Promise, true);
		});
	});
	describe('#clearFragment', function() {
		it('should clear URI hash', function(done) {
			var locator = createLocator(),
				api = new ModuleApiProvider(locator),
				requestRouter = locator.resolve('requestRouter');
			requestRouter.on('clearFragment', function(args) {
				assert.strictEqual(args.length, 0);
			});
			jsdom.env({
				url: 'http://local',
				html: ' ',
				done: function(errors, window) {
					window.location.hash = '#some';
					locator.registerInstance('window', window);
					assert.strictEqual(
						window.location.toString(), 'http://local/#some'
					);
					api.clearFragment()
						.then(function() {
							assert.strictEqual(
								window.location.toString(), 'http://local/'
							);
							done();
						})
						.catch(done);
				}
			});
		});
	});
});

function createLocator() {
	var locator = new ServiceLocator();

	var requestRouter = new UniversalMock([
		'go', 'clearFragment'
	]);
	requestRouter.decorateMethod('go', function() {
		return Promise.resolve();
	});
	locator.registerInstance('requestRouter', requestRouter);
	var templateProvider = new UniversalMock(['render']);
	templateProvider.decorateMethod('render', function() {
		return Promise.resolve();
	});
	locator.registerInstance('cookieWrapper', {
		get: function() {},
		set: function() {}
	});
	locator.registerInstance('templateProvider', templateProvider);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('eventBus', new events.EventEmitter());

	return locator;
}
