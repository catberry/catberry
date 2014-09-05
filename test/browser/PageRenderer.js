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
	events = require('events'),
	jsdom = require('jsdom'),
	UniversalMock = require('../mocks/UniversalMock'),
	ModuleLoaderMock = require('../mocks/ModuleLoader'),
	Logger = require('../mocks/Logger'),
	PageRenderer = require('../../browser/PageRenderer'),
	StateProvider = require('../../lib/StateProvider'),
	ContextFactory = require('../../lib/ContextFactory'),
	ModuleApiProvider = require('../../browser/ModuleApiProvider'),
	CookiesWrapper = require('../../browser/CookiesWrapper'),
	ServiceLocator = require('catberry-locator');

describe('browser/PageRenderer', function () {
	describe('#renderPlaceholder', function () {
		it('should properly render placeholder on page',
			function (done) {
				var page = '<div id="module_first"></div>',
					expected = '<div id="module_first">test1</div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				modules.module.implementation.decorateMethod('render',
					function (name) {
						assert.strictEqual(name, 'first');
						return {data: 'test1'};
					});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator
									.resolveInstance(PageRenderer),
								renderingParameters = {
									state: {
										module: {
											first: 'test1'
										}
									}
								};
							pageRenderer.renderPlaceholder(
								modules.module.placeholders.first,
								renderingParameters
							)
								.then(function (context) {
									assert.strictEqual(
										Object.keys(context.rendered).length, 1
									);
									assert.strictEqual(
											'module_first' in context.rendered,
										true
									);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected
									);
								})
								.then(function () {
									done();
								}, function (error) {
									done(error);
								});
						});
					}
				});
			});

		it('should properly render HEAD element placeholder',
			function (done) {
				var head = '<title>First title</title>' +
						'<base href="someLink1" target="_parent">' +
						'<noscript>noScript1</noscript>' +
						'<style type="text/css">' +
						'some styles1' +
						'</style>' +
						'<style type="text/css">' +
						'some styles2' +
						'</style>' +
						'<script type="application/javascript">' +
						'some scripts1' +
						'</script>' +
						'<script type="application/javascript">' +
						'some scripts2' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc1">' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc2">' +
						'</script>' +
						'<link rel="stylesheet" href="someStyleLink1">' +
						'<link rel="stylesheet" href="someStyleLink2">' +
						'<meta name="name1" content="value1">' +
						'<meta name="name2" content="value2">' +
						'<meta name="name3" content="value3">',
					newHead = '<title>Second title</title>' +
						'<base href="someLink2" target="_parent">' +
						'<noscript>noScript2</noscript>' +
						'<style type="text/css">' +
						'some styles1' +
						'</style>' +
						'<script type="application/javascript">' +
						'some scripts1' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc1">' +
						'</script>' +
						'<link rel="stylesheet" href="someStyleLink1">' +
						'<meta name="name1" content="value1">' +
						'<style type="text/css">' +
						'some styles3' +
						'</style>' +
						'<script type="application/javascript">' +
						'some scripts3' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc3">' +
						'</script>' +
						'<link rel="stylesheet" href="someStyleLink3">' +
						'<meta name="name4" content="value4">',
					expected = '<title>Second title</title>' +
						'<base href="someLink2" target="_parent">' +
						'<noscript>noScript2</noscript>' +
						'<style type="text/css">' +
						'some styles1' +
						'</style>' +
						'<style type="text/css">' +
						'some styles2' +
						'</style>' +
						'<script type="application/javascript">' +
						'some scripts1' +
						'</script>' +
						'<script type="application/javascript">' +
						'some scripts2' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc1">' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc2">' +
						'</script>' +
						'<link rel="stylesheet" href="someStyleLink1">' +
						'<link rel="stylesheet" href="someStyleLink2">' +
						'<meta name="name1" content="value1">' +
						'<style type="text/css">' +
						'some styles3' +
						'</style>' +
						'<script type="application/javascript">' +
						'some scripts3' +
						'</script>' +
						'<script type="application/javascript" ' +
						'src="someScriptSrc3">' +
						'</script>' +
						'<link rel="stylesheet" href="someStyleLink3">' +
						'<meta name="name4" content="value4">',
					modules = createModules(),
					locator = createLocator({modules: modules});

				jsdom.env({
					html: '<div></div>',
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery'),
							currentHead = $('<head></head>');
						currentHead.html(head);
						locator.resolveInstance(PageRenderer)
							._mergeHead(currentHead, newHead);
						assert.strictEqual(currentHead.html(), expected);
						done();
					}
				});
			});

		it('should properly render recursive placeholders on page',
			function (done) {
				var page = '<div id="module_second"></div>',
					expected = '<div id="module_second">test2' +
						'<div id="module_first">test1</div></div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames(),
					dataContext = {};

				modules.module.implementation.decorateMethod('render',
					function (name) {
						dataContext[name] = {
							data: name === 'first' ? 'test1' : 'test2'
						};
						return dataContext[name];
					});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator
									.resolveInstance(PageRenderer),
								renderingParameters = {
									module: {
										first: 'test1',
										second: 'test2'
									}
								};
							pageRenderer.renderPlaceholder(
								modules.module.placeholders.second,
								renderingParameters
							)
								.then(function (context) {
									assert.strictEqual(
										Object.keys(context.rendered).length, 2
									);
									assert.strictEqual(
											'module_first' in context.rendered,
										true
									);
									assert.strictEqual(
											'module_second' in context.rendered,
										true
									);
									assert.deepEqual(
										dataContext.first, {data: 'test1'}
									);
									assert.deepEqual(
										dataContext.second, {data: 'test2'}
									);
									assert.strictEqual(
											'module_second' in context.rendered,
										true
									);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected
									);
								})
								.then(function () {
									done();
								}, function (error) {
									done(error);
								});
						});
					}
				});
			});

		it('should properly render empty space when error while render',
			function (done) {
				var page = '<div id="moduleWithError_first"></div>',
					expected = '<div id="moduleWithError_first"></div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				modules.moduleWithError.implementation.decorateMethod('render',
					function () {
						throw new Error();
					});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator.resolveInstance(
									PageRenderer, {
										isRelease: true
									}),
								renderingParameters = {
									state: {
										moduleWithError: {
											first: 'test1'
										}
									}
								};
							pageRenderer.renderPlaceholder(
								modules.moduleWithError.placeholders.first,
								renderingParameters
							)
								.then(function (context) {
									assert.strictEqual(
										Object.keys(context.rendered).length, 1
									);
									assert.strictEqual(
											'moduleWithError' +
											'_first' in context.rendered,
										true
									);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected
									);
								})
								.then(function () {
									done();
								}, function (error) {
									done(error);
								});
						});
					}
				});
			});

		it('should properly render error placeholder when error while render',
			function (done) {
				var page = '<div id="moduleWithError_first"></div>',
					expected = '<div id="moduleWithError_first">' +
						'error placeholder' +
						'</div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				modules.moduleWithError.errorPlaceholder =
					modules.moduleWithError.placeholders.__error;

				modules.moduleWithError.implementation.once('render',
					function (args) {
						args[1](new Error());
					});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator.resolveInstance(
									PageRenderer, {
										isRelease: true
									}),
								renderingParameters = {
									state: {
										moduleWithError: {
											first: 'test1'
										}
									}
								};
							pageRenderer.renderPlaceholder(
								modules.moduleWithError.placeholders.first,
								renderingParameters
							)
								.then(function (context) {
									assert.strictEqual(
										Object.keys(context.rendered).length, 1
									);
									assert.strictEqual(
											'moduleWithError' +
											'_first' in context.rendered,
										true
									);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected
									);
								})
								.then(function () {
									done();
								}, function (error) {
									done(error);
								});
						});
					}
				});
			});
	});

	describe('#render', function () {
		it('should render module\'s placeholders in nesting order',
			function (done) {
				var page = '<div id="module2_second"></div>',
					expected = '<div id="module2_second">test1' +
						'<div id="module2_first">test2' +
						'<div id="module_first">test3' +
						'</div></div></div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames(),
					order = [];

				modules.module.implementation.decorateMethod('render',
					function (name) {
						order.push('module_' + name);
						return Promise.resolve({
							data: 'test3'
						});
					});

				modules.module2.implementation.decorateMethod('render',
					function (name) {
						order.push('module2_' + name);
						return Promise.resolve({
							data: name === 'first' ? 'test2' : 'test1'
						});
					});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator
									.resolveInstance(PageRenderer),
								renderingParameters = {
									state: {
										module: {
											first: 'test3'
										},
										module2: {
											first: 'test2',
											second: 'test1'
										}
									}
								};

							pageRenderer.render(renderingParameters)
								.then(function () {
									assert.strictEqual(order.length, 3);
									assert.strictEqual(
										order[0], 'module2_second'
									);
									assert.strictEqual(
										order[1], 'module2_first'
									);
									assert.strictEqual(
										order[2], 'module_first'
									);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected
									);
								})
								.then(function () {
									done();
								}, function (error) {
									done(error);
								});
						});
					}
				});
			});

		it('should re-render module\'s placeholders only for changed parameters',
			function (done) {
				var page = '<div id="module2_second">dummy' +
						'<div id="module2_first">dummy' +
						'<div id="module_first">dummy' +
						'</div></div></div>',
					expected = '<div id="module2_second">dummy' +
						'<div id="module2_first">dummy' +
						'<div id="module_first">test3' +
						'</div></div></div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames(),
					order = [];

				modules.module.implementation.decorateMethod('render',
					function (name) {
						order.push('module_' + name);
						return Promise.resolve({
							data: 'test3'
						});
					});

				modules.module2.implementation.decorateMethod('render',
					function (name) {
						order.push('module2_' + name);
						return Promise.resolve({
							data: name === 'first' ? 'test2' : 'test1'
						});
					});
				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator
									.resolveInstance(PageRenderer),
								renderingParameters = {
									state: {
										module: {
											first: 'test3'
										}
									}
								};

							pageRenderer.render(renderingParameters)
								.then(function () {
									assert.strictEqual(order.length, 1);
									assert.strictEqual(order[0],
										'module_first');
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);

									order = [];
									return pageRenderer.render(
										renderingParameters
									);
								})
								.then(function () {
									assert.strictEqual(order.length, 0);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected
									);
								})
								.then(function () {
									done();
								}, function (error) {
									done(error);
								});
						});
					}
				});
			});
	});
});

function createLocator() {
	var locator = new ServiceLocator(),
		eventBus = new events.EventEmitter(),
		logger = new Logger(),
		modules = createModules(),
		moduleLoader = new ModuleLoaderMock(modules);

	eventBus.on('error', function (error) {
		logger.error(error);
	});
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('moduleLoader', moduleLoader);
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('logger', logger);
	locator.register('stateProvider', StateProvider);
	locator.register('contextFactory', ContextFactory);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookiesWrapper', CookiesWrapper);
	return locator;
}

function prepareWindow(window, locator) {
	window.location.assign = window.location.replace;
	delete require.cache.jquery;
	var $ = require('jquery')(window);
	locator.registerInstance('window', window);
	locator.registerInstance('jQuery', $);
}

function createModules() {
	var context = {
		state: {},
		cookies: {
			get: function () {},
			set: function () {}
		},
		renderedData: {}
	};

	var moduleImplementation = new UniversalMock(['render']);
	moduleImplementation.$context = Object.create(context);
	moduleImplementation.$context.name = 'module';

	var module2Implementation = new UniversalMock(['render']);
	module2Implementation.$context = Object.create(context);
	module2Implementation.$context.name = 'module2';

	var moduleWithErrorImplementation = new UniversalMock(['render']);
	moduleWithErrorImplementation.$context = Object.create(context);
	moduleWithErrorImplementation.$context.name = 'moduleWithError';
	return {
		module: {
			name: 'module',
			implementation: moduleImplementation,
			placeholders: {
				first: {
					name: 'first',
					fullName: 'module_first',
					moduleName: 'module',
					render: function (context) {
						return Promise.resolve(context.data);
					}
				},
				second: {
					name: 'second',
					fullName: 'module_second',
					moduleName: 'module',
					render: function (context) {
						return Promise.resolve(
								context.data + '<div id="module_first">'
						);
					}
				}
			}
		},
		module2: {
			name: 'module2',
			implementation: module2Implementation,
			placeholders: {
				first: {
					name: 'first',
					fullName: 'module2_first',
					moduleName: 'module2',
					render: function (context) {
						return Promise.resolve(
								context.data + '<div id="module_first">'
						);
					}
				},
				second: {
					name: 'second',
					fullName: 'module2_second',
					moduleName: 'module2',
					render: function (context) {
						return Promise.resolve(
								context.data + '<div id="module2_first">'
						);
					}
				}
			}
		},
		moduleWithError: {
			name: 'moduleWithError',
			implementation: moduleWithErrorImplementation,
			placeholders: {
				first: {
					name: 'first',
					fullName: 'moduleWithError_first',
					moduleName: 'moduleWithError',
					render: function () {
						return Promise.reject(new Error('content'));
					}
				},
				__error: {
					name: '_lastError',
					fullName: 'moduleWithError__lastError',
					moduleName: 'moduleWithError',
					render: function () {
						return Promise.resolve('error placeholder');
					}
				}
			}
		}
	};
}
