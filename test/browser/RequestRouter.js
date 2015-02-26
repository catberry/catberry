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
	Logger = require('../mocks/Logger'),
	UniversalMock = require('../mocks/UniversalMock'),
	ServiceLocator = require('catberry-locator'),
	StateProvider = require('../../lib/providers/StateProvider'),
	ContextFactory = require('../../lib/ContextFactory'),
	CookieWrapper = require('../../browser/CookieWrapper'),
	RequestRouter = require('../../browser/RequestRouter');

describe('browser/RequestRouter', function () {
	describe('#route', function () {
		it('should catch internal link click and change state',
			function (done) {
				var locator = createLocator(),
					documentRenderer = locator.resolve('documentRenderer'),
					eventBus = locator.resolve('eventBus'),
					isChecked = false,
					link = '/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition', {
					expression: '/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]',
					map: function (state) {
						state.second.hello = 'world';
						return state;
					}
				});
				eventBus.on('error', done);
				eventBus.once('documentRendered', function (context) {
					assert.strictEqual(typeof(context), 'object');
					assert.strictEqual(
						context.location.toString(),
						'http://local' + link
					);
					assert.strictEqual(
						documentRenderer.state.first.first, 'firstValue');
					assert.strictEqual(
						documentRenderer.state.second.second, 'secondValue');
					assert.strictEqual(
						documentRenderer.state.first.global, 'globalValue');
					assert.strictEqual(
						documentRenderer.state.second.global, 'globalValue');
					assert.strictEqual(
						documentRenderer.state.second.hello, 'world');
					isChecked = true;
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location.replace('http://local/some');
						locator.resolveInstance(RequestRouter);

						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(isChecked, true);
							assert.strictEqual(window.location.toString(),
								'http://local' + link);
							assert.strictEqual(window.history.length, 2);
							done();
						}, 10);
					}
				});
			}
		);

		it('should catch click on item inside link and change state',
			function (done) {
				var locator = createLocator(),
					documentRenderer = locator.resolve('documentRenderer'),
					eventBus = locator.resolve('eventBus'),
					isChecked = false,
					link = '/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition', {
					expression: '/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]',
					map: function (state) {
						state.second.hello = 'world';
						return state;
					}
				});
				eventBus.on('error', done);
				eventBus.once('documentRendered', function (context) {
					assert.strictEqual(typeof(context), 'object');
					assert.strictEqual(
						context.location.toString(),
						'http://local' + link
					);
					assert.strictEqual(
						documentRenderer.state.first.first, 'firstValue');
					assert.strictEqual(
						documentRenderer.state.second.second, 'secondValue');
					assert.strictEqual(
						documentRenderer.state.first.global, 'globalValue');
					assert.strictEqual(
						documentRenderer.state.second.global, 'globalValue');
					assert.strictEqual(
						documentRenderer.state.second.hello, 'world');
					isChecked = true;
				});

				jsdom.env({
					html: '<a href="' + link + '"><span><div></div></span></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location.replace('http://local/some');
						locator.resolveInstance(RequestRouter);

						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('div')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(isChecked, true);
							assert.strictEqual(window.location.toString(),
								'http://local' + link);
							assert.strictEqual(window.history.length, 2);
							done();
						}, 10);
					}
				});
			}
		);

		it('should catch link click and change state if link starts with //',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer'),
					isChecked = false,
					link = '//local1.com/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function () {
					assert.strictEqual(
						documentRenderer.state.first.first, 'firstValue'
					);
					assert.strictEqual(
						documentRenderer.state.second.second, 'secondValue'
					);
					assert.strictEqual(
						documentRenderer.state.first.global, 'globalValue'
					);
					assert.strictEqual(
						documentRenderer.state.second.global, 'globalValue'
					);
					isChecked = true;
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location
							.replace('https://local1.com/some');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(isChecked, true);
							assert.strictEqual(
								window.location.toString(),
								'https:' + link);
							done();
						}, 10);
					}
				});
			}
		);

		it('should properly handle relative URIs with .. and change state',
			function (done) {
				var locator = createLocator(),
					documentRenderer = locator.resolve('documentRenderer'),
					eventBus = locator.resolve('eventBus'),
					isChecked = false,
					link = '../../some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function (context) {
					assert.strictEqual(typeof(context), 'object');
					assert.strictEqual(
						context.location.toString(),
						'http://local:9090/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue'
					);
					assert.strictEqual(
						documentRenderer.state.first.first, 'firstValue');
					assert.strictEqual(
						documentRenderer.state.second.second, 'secondValue');
					assert.strictEqual(
						documentRenderer.state.first.global, 'globalValue');
					assert.strictEqual(
						documentRenderer.state.second.global, 'globalValue');
					isChecked = true;
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location.replace('http://local:9090/a/b');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(isChecked, true);
							assert.strictEqual(
								window.location.toString(),
								'http://local:9090/some/' +
								'?global=globalValue' +
								'&first=firstValue' +
								'&second=secondValue'
							);
							done();
						}, 10);
					}
				});
			}
		);

		it('should properly handle relative URIs without .. and change state',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer'),
					isChecked = false,
					link = 'some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition', {
					expression: /\/some.+/,
					map: function () {
						return {
							first: {
								first: 'firstValue'
							},
							second: {
								second: 'secondValue'
							}
						};
					}
				});

				eventBus.on('error', done);
				eventBus.once('documentRendered', function (context) {
					assert.strictEqual(typeof(context), 'object');
					assert.strictEqual(
						context.location.toString(),
						'http://local:9090/a/b/' + link
					);
					assert.strictEqual(
						documentRenderer.state.first.first, 'firstValue');
					assert.strictEqual(
						documentRenderer.state.second.second, 'secondValue');
					isChecked = true;
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location.replace('http://local:9090/a/b/');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(isChecked, true);
							assert.strictEqual(
								window.location.toString(),
								'http://local:9090/a/b/' + link);
							done();
						}, 10);
					}
				});
			}
		);

		it('should not change state if link changes host',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer'),
					link = 'http://local1.com/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function () {
					assert.fail('If link changes page this event ' +
					'should not be triggered');
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location
							.replace('http://local2.com/some');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(
								window.location.toString(),
								'http://local2.com/some'
							);
							done();
						}, 10);
					}
				});
			}
		);

		it('should not change state if link has "target" attribute',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer'),
					link = 'http://local1.com/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function () {
					assert.fail('If link changes page this event ' +
					'should not be triggered');
				});

				jsdom.env({
					html: '<a href="' + link + '" target="_blank"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location
							.replace('http://local1.com/some');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(
								window.location.toString(),
								'http://local1.com/some'
							);
							done();
						}, 10);
					}
				});
			}
		);

		it('should not change state if click on element ' +
			'that is not inside the link',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer'),
					link = 'http://local1.com/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function () {
					assert.fail('If link changes page this event ' +
					'should not be triggered');
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>' +
					'<span><div></div></span>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location
							.replace('http://local1.com/some');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('div')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(
								window.location.toString(),
								'http://local1.com/some'
							);
							done();
						}, 10);
					}
				});
			}
		);

		it('should not change state if link has been clicked ' +
			'by middle mouse button',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer'),
					link = 'http://local1.com/some/' +
						'?global=globalValue' +
						'&first=firstValue' +
						'&second=secondValue';

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function () {
					assert.fail('If link changes page this event ' +
					'should not be triggered');
				});

				jsdom.env({
					html: '<a href="' + link + '"></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location
							.replace('http://local1.com/some');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						event.button = 1;
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(
								window.location.toString(),
								'http://local1.com/some'
							);
							done();
						}, 10);
					}
				});
			}
		);

		it('should not change state if link does not have "href" attribute',
			function (done) {
				var locator = createLocator(),
					eventBus = locator.resolve('eventBus'),
					documentRenderer = locator.resolve('documentRenderer');

				locator.registerInstance('routeDefinition',
					'/some/' +
					'?global=:global[first,second]' +
					'&first=:first[first]' +
					'&second=:second[second]'
				);

				eventBus.on('error', done);
				eventBus.once('documentRendered', function () {
					assert.fail('If link changes page this event ' +
					'should not be triggered');
				});

				jsdom.env({
					html: '<a></a>',
					done: function (errors, window) {
						locator.registerInstance('window', window);
						window.location
							.replace('http://local1.com/some');
						locator.resolveInstance(RequestRouter);
						var event = window.document
							.createEvent('MouseEvents');
						event.initEvent('click', true, true);
						window.document
							.getElementsByTagName('a')[0]
							.dispatchEvent(event);
						setTimeout(function () {
							assert.strictEqual(
								window.location.toString(),
								'http://local1.com/some'
							);
							done();
						}, 10);
					}
				});
			}
		);
	});
});

function createLocator() {
	var locator = new ServiceLocator();

	var eventBus = new events.EventEmitter();
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger);
	locator.register('cookieWrapper', CookieWrapper);
	var documentRenderer = {
		render: function (state, context) {
			var last = documentRenderer.context;
			documentRenderer.state = state;
			documentRenderer.context = context;
			if (last) {
				eventBus.emit('documentRendered', context);
			}
			return Promise.resolve();
		}
	};
	locator.registerInstance('documentRenderer', documentRenderer);
	locator.registerInstance('moduleApiProvider',
		new UniversalMock(['redirect']));
	locator.register('stateProvider', StateProvider);
	locator.register('contextFactory', ContextFactory);
	return locator;
}
