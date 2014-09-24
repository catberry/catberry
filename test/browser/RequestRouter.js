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
	StateProvider = require('../../lib/StateProvider'),
	ContextFactory = require('../../lib/ContextFactory'),
	CookiesWrapper = require('../../browser/CookiesWrapper'),
	RequestRouter = require('../../browser/RequestRouter');

describe('browser/RequestRouter', function () {
	describe('#route', function () {
		describe('hash handle', function () {
			it('should catch hash on start and request event routing',
				function (done) {
					var locator = createLocator(),
						eventRouter = locator.resolve('eventRouter');
					eventRouter.once('routeHashChange', function (args) {
						assert.strictEqual(args[0], 'test-hash',
							'Wrong event name');
						done();
					});

					jsdom.env({
						html: ' ',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location
									.assign('http://local/some#test-hash');
								locator.resolveInstance(RequestRouter);
							});
						}
					});
				}
			);

			it('should not catch empty hash on start',
				function (done) {
					var locator = createLocator(),
						eventRouter = locator.resolve('eventRouter');
					eventRouter.once('routeHashChange', function () {
						assert.fail('Should not handle this event');
					});

					jsdom.env({
						html: ' ',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);
								setTimeout(done, 100);
							});
						}
					});
				}
			);

			it('should always catch hash change and request event routing',
				function (done) {
					var locator = createLocator(),
						eventRouter = locator.resolve('eventRouter');

					jsdom.env({
						html: ' ',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);

								new Promise(function (fulfill) {
									eventRouter.once('routeHashChange',
										function (args) {
											assert.strictEqual(
												args[0], 'test1'
											);
											fulfill();
										});

									// first set hash to test1
									window.location.assign(
										'http://local/some#test1'
									);
									$(window).trigger('hashchange');
								})
									.then(function () {
										return new Promise(function (fulfill) {
											eventRouter.once('routeHashChange',
												function (args) {
													assert.strictEqual(
														args[0], 'test2'
													);
													fulfill();
												});

											// second set to test2
											window.location.assign(
												'http://local/some#test2'
											);
											$(window).trigger('hashchange');

										});
									})
									.then(function () {
										return new Promise(function (fulfill) {
											eventRouter.once('routeHashChange',
												function (args) {
													assert.strictEqual(
														args[0], ''
													);
													fulfill();
												});
											// at last remove any hash
											window.location.assign(
												'http://local/some'
											);
											$(window).trigger('hashchange');
										});
									})
									.then(function () {
										done();
									}, function (error) {
										done(error);
									});
							});
						}
					});
				}
			);
		});
		describe('link event handle', function () {
			it('should catch link click and ' +
					'raise event if data-event attribute',
				function (done) {
					var locator = createLocator(),
						eventRouter = locator.resolve('eventRouter');

					jsdom.env({
						html: '<a id="link" data-event="test1"></a>',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);

								eventRouter.once('routeDataEvent',
									function (args) {
										assert.strictEqual(args[0], 'test1');
										done();
									});

								$('#link').trigger('click');
							});
						}
					});
				});
			it('should catch link click in child element and raise event',
				function (done) {
					var locator = createLocator(),
						eventRouter = locator.resolve('eventRouter');

					jsdom.env({
						html: '<a data-event="test1">' +
							'<div>' +
							'<span><span id="click-here"></span></span>' +
							'</div>' +
							'</a>',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);

								eventRouter.once('routeDataEvent',
									function (args) {
										assert.strictEqual(args[0], 'test1');
										done();
									});

								$('#click-here').trigger('click');
							});
						}
					});
				});
		});

		describe('link render', function () {
			it('should catch link click and request rendering',
				function (done) {
					var locator = createLocator(),
						pageRenderer = locator.resolve('pageRenderer'),
						currentWindow,
						link = '/some/' +
							'?global=globalValue' +
							'&first=firstValue' +
							'&second=secondValue';

					locator.registerInstance('routeDefinition',
							'/some/' +
							'?global=:global[first,second]' +
							'&first=:first[first]' +
							'&second=:second[second]'
					);
					pageRenderer.once('render', function (args) {
						assert.strictEqual(typeof(args[0]), 'object');
						assert.strictEqual(args[0].urlPath, link);
						assert.strictEqual(
							typeof(args[0].state), 'object');
						assert.strictEqual(
							typeof(args[0].renderedData), 'object');
						assert.strictEqual(
							typeof(args[0].cookies), 'object');
						assert.strictEqual(
							typeof(args[0].state.first), 'object');
						assert.strictEqual(
							typeof(args[0].state.second), 'object');
						assert.strictEqual(
							args[0].state.first.first, 'firstValue');
						assert.strictEqual(
							args[0].state.second.second, 'secondValue');
						assert.strictEqual(
							args[0].state.first.global, 'globalValue');
						assert.strictEqual(
							args[0].state.second.global, 'globalValue');
						assert.strictEqual(currentWindow.location.toString(),
								'http://local' + link);
						assert.strictEqual(currentWindow.history.length, 1);
						done();
					});

					jsdom.env({
						html: '<a href="' + link + '"/>',
						done: function (errors, window) {
							currentWindow = window;
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);
								$('a').trigger('click');
							});
						}
					});
				}
			);

			it('should properly handle relative URLs with ..',
				function (done) {
					var locator = createLocator(),
						pageRenderer = locator.resolve('pageRenderer'),
						currentWindow,
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

					jsdom.env({
						html: '<a href="' + link + '"/>',
						done: function (errors, window) {
							currentWindow = window;
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local:9090/a/b');
								locator.resolveInstance(RequestRouter);
								$('a').trigger('click');
								assert.strictEqual(
									currentWindow.location.toString(),
										'http://local:9090/some/' +
										'?global=globalValue' +
										'&first=firstValue' +
										'&second=secondValue'
								);
								done();
							});
						}
					});
				}
			);

			it('should properly handle relative URLs without ..',
				function (done) {
					var locator = createLocator(),
						pageRenderer = locator.resolve('pageRenderer'),
						currentWindow,
						link = 'some/' +
							'?global=globalValue' +
							'&first=firstValue' +
							'&second=secondValue';

					locator.registerInstance('routeDefinition',
							'/some/' +
							'?global=:global[first,second]' +
							'&first=:first[first]' +
							'&second=:second[second]'
					);

					jsdom.env({
						html: '<a href="' + link + '"/>',
						done: function (errors, window) {
							currentWindow = window;
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local:9090/a/b');
								locator.resolveInstance(RequestRouter);
								$('a').trigger('click');
								assert.strictEqual(
									currentWindow.location.toString(),
										'http://local:9090/a/b/' + link);
								done();
							});
						}
					});
				}
			);

			it('should catch link click and pass through if link changes host',
				function (done) {
					var locator = createLocator(),
						pageRenderer = locator.resolve('pageRenderer'),
						currentWindow,
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

					pageRenderer.once('render', function () {
						assert.fail('If link changes page this event ' +
							'should not be triggered');
					});

					jsdom.env({
						html: '<a href="' + link + '"/>',
						done: function (errors, window) {
							currentWindow = window;
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location
									.assign('http://local2.com/some');
								locator.resolveInstance(RequestRouter);
								$('a').trigger('click');
								setTimeout(function () {
									assert.strictEqual(
										window.location.toString(), link);
									done();
								}, 100);
							});
						}
					});
				}
			);
		});

		describe('form submit', function () {
			it('should catch submit click and request module data submitting',
				function (done) {
					var form = '<form name="write_some" ' +
						'action="/some/?some_arg=value" ' +
						'data-module="receiver" ' +
						'data-dependents="some_first&receiver_second">' +
						'<input type="text" name="text">' +
						'<input type="submit" value="Submit">' +
						'</form>';

					var locator = createLocator(),
						formSubmitter = locator.resolve('formSubmitter');

					formSubmitter.canSubmit = function () {
						return true;
					};

					formSubmitter.once('submit', function (args) {
						assert.strictEqual(args[0].length, 1);
						assert.strictEqual(args[0].attr('name'), 'write_some');
						done();
					});

					jsdom.env({
						html: '<div id="form"></div>',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);
								$('#form').html(form);
								$('form').trigger('submit');
							});
						}
					});
				});

			it('should not catch submit click if input is not inside form',
				function (done) {
					var input = '<input type="submit" value="Submit">',
						locator = createLocator(),
						formSubmitter = locator.resolve('formSubmitter');

					formSubmitter.once('submit', function () {
						assert.fail('This event should not be triggered ' +
							'because button is not in form');
					});

					jsdom.env({
						html: '<div id="form"></div>',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);
								$('#form').html(input);
								$('form').trigger('submit');
								setTimeout(function () {
									done();
								}, 100);
							});
						}
					});
				});

			it('should not catch submit click if submitter can not handle it',
				function (done) {
					var form = '<form name="write_some" ' +
						'action="/some/?some_arg=value" ' +
						'data-module="receiver" ' +
						'data-dependents="some_first&receiver_second">' +
						'<input type="text" name="text">' +
						'<input type="submit" value="Submit">' +
						'</form>';
					var locator = createLocator(),
						formSubmitter = locator.resolve('formSubmitter');

					formSubmitter.decorateMethod('canSubmit', function () {
						return false;
					});
					formSubmitter.once('submit', function () {
						assert.fail('This event should not be triggered ' +
							'because submitter can not handle request');
					});

					jsdom.env({
						html: '<div id="form"></div>',
						done: function (errors, window) {
							prepareWindow(window, locator);
							var $ = locator.resolve('jQuery');
							$(function () {
								window.location.assign('http://local/some');
								locator.resolveInstance(RequestRouter);
								$('#form').html(form);
								$('form').trigger('submit');
								setTimeout(function () {
									done();
								}, 100);
							});
						}
					});
				});
		});
	});
});

function createLocator() {
	var locator = new ServiceLocator(),
		moduleLoader = {
			getModulesByNames: function () {
				return {};
			},
			lastRenderedData: {}
		};

	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger);
	locator.register('cookiesWrapper', CookiesWrapper);
	locator.registerInstance('pageRenderer', new UniversalMock(['render']));
	locator.registerInstance('eventRouter',
		new UniversalMock(['routeDataEvent', 'routeHashChange']));
	locator.registerInstance('moduleApiProvider',
		new UniversalMock(['redirect']));
	locator.registerInstance('formSubmitter',
		new UniversalMock(['submit', 'canSubmit']));
	locator.registerInstance('moduleLoader', moduleLoader);
	locator.register('stateProvider', StateProvider);
	locator.register('contextFactory', ContextFactory);
	return locator;
}

function prepareWindow(window, locator) {
	window.location.assign = window.location.replace;
	delete require.cache.jquery;
	var $ = require('jquery')(window);
	locator.registerInstance('window', window);
	locator.registerInstance('jQuery', $);
}
