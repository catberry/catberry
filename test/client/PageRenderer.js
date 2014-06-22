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
	jsdom = require('jsdom'),
	UniversalMock = require('../mocks/UniversalMock'),
	ContentReadable = require('../../lib/server/streams/ContentReadable'),
	Logger = require('../mocks/Logger'),
	PageRenderer = require('../../lib/client/PageRenderer'),
	StateProvider = require('../../lib/StateProvider'),
	ServiceLocator = require('catberry-locator');

describe('client/PageRenderer', function () {
	describe('#renderPlaceholder', function () {
		it('should properly render placeholder on page',
			function (done) {
				var page = '<div id="module_first"></div>',
					expected = '<div id="module_first">test1</div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames();

				modules.module.implementation.once('render', function (args) {
					assert.strictEqual(args[0], 'first');
					args[1](null, {data: 'test1'});
				});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator
									.resolveInstance(PageRenderer),
								rendered = {},
								renderingParameters = {
									state: {
										module: {
											first: 'test1'
										}
									}
								};
							pageRenderer.renderPlaceholder(
								modules.module.placeholders.first,
								renderingParameters,
								rendered,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(
										Object.keys(rendered).length, 1);
									assert.strictEqual(
											'module_first' in rendered, true);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);
									done();
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
					context = {};

				modules.module.implementation.on('render', function (args) {
					context[args[0]] = {
						data: args[0] === 'first' ? 'test1' : 'test2'
					};
					args[1](null, context[args[0]]);
				});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator
									.resolveInstance(PageRenderer),
								rendered = {};
							var renderingParameters = {
								module: {
									first: 'test1',
									second: 'test2'
								}
							};
							pageRenderer.renderPlaceholder(
								modules.module.placeholders.second,
								renderingParameters,
								rendered,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(
										Object.keys(rendered).length, 2);
									assert.strictEqual(
											'module_first' in rendered, true);
									assert.strictEqual(
											'module_second' in rendered, true);
									assert.deepEqual(
										context.first, {data: 'test1'});
									assert.deepEqual(
										context.second, {data: 'test2'});
									assert.strictEqual(
											'module_second' in rendered, true);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);
									done();
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
								rendered = {};
							var renderingParameters = {
								state: {
									moduleWithError: {
										first: 'test1'
									}
								}
							};
							pageRenderer.renderPlaceholder(
								modules.moduleWithError.placeholders.first,
								renderingParameters, rendered,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(
										Object.keys(rendered).length, 1);
									assert.strictEqual(
											'moduleWithError_first' in rendered,
										true);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);
									done();
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
								rendered = {},
								renderingParameters = {
									state: {
										moduleWithError: {
											first: 'test1'
										}
									}
								};
							pageRenderer.renderPlaceholder(
								modules.moduleWithError.placeholders.first,
								renderingParameters, rendered,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(
										Object.keys(rendered).length, 1);
									assert.strictEqual(
											'moduleWithError_first' in rendered,
										true);
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);
									done();
								});
						});
					}
				});
			});
	});

	describe('#renderModule', function () {
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

				modules.module.implementation.on('render',
					function (args) {
						order.push('module_' + args[0]);
						args[1](null, {
							data: 'test3'
						});
					});
				modules.module2.implementation.on('render',
					function (args) {
						order.push('module2_' + args[0]);
						args[1](null, {
							data: args[0] === 'first' ? 'test2' : 'test1'
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
								rendered = {},
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

							pageRenderer.renderModule(
								modules.module2,
								renderingParameters,
								renderingParameters.state,
								rendered,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(
										Object.keys(rendered).length, 3);
									assert.strictEqual(order.length, 3);
									assert.strictEqual(
											'module2_second' in rendered, true);
									assert.strictEqual(
											'module2_first' in rendered, true);
									assert.strictEqual(
											'module_first' in rendered, true);
									assert.strictEqual(order[0],
										'module2_second');
									assert.strictEqual(order[1],
										'module2_first');
									assert.strictEqual(order[2],
										'module_first');
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);
									done();
								});
						});
					}
				});
			});

		it('should re-render module\'s placeholders in nesting order',
			function (done) {
				var page = '<div id="module2_second">dummy' +
						'<div id="module2_first">dummy' +
						'<div id="module_first">dummy' +
						'</div></div></div>',
					expected = '<div id="module2_second">test1' +
						'<div id="module2_first">test2' +
						'<div id="module_first">test3' +
						'</div></div></div>',
					locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					modules = moduleLoader.getModulesByNames(),
					order = [];

				modules.module.implementation.on('render',
					function (args) {
						order.push('module_' + args[0]);
						args[1](null, {
							data: 'test3'
						});
					});

				modules.module2.implementation.on('render',
					function (args) {
						order.push('module2_' + args[0]);
						args[1](null, {
							data: args[0] === 'first' ? 'test2' : 'test1'
						});
					});

				jsdom.env({
					html: page,
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							var pageRenderer = locator.resolveInstance(PageRenderer),
								rendered = {},
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

							pageRenderer.renderModule(
								modules.module2,
								renderingParameters,
								renderingParameters.state,
								rendered,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(
										Object.keys(rendered).length, 3);
									assert.strictEqual(order.length, 3);
									assert.strictEqual(
											'module2_second' in rendered, true);
									assert.strictEqual(
											'module2_first' in rendered, true);
									assert.strictEqual(
											'module_first' in rendered, true);
									assert.strictEqual(order[0],
										'module2_second');
									assert.strictEqual(order[1],
										'module2_first');
									assert.strictEqual(order[2],
										'module_first');

									assert.strictEqual(
										window.document.body.innerHTML,
										expected);
									done();
								});
						});
					}
				});
			});
	});

	describe('#render', function () {
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

				modules.module.implementation.on('render',
					function (args) {
						order.push('module_' + args[0]);
						args[1](null, {
							data: 'test3'
						});
					});

				modules.module2.implementation.on('render',
					function (args) {
						order.push('module2_' + args[0]);
						args[1](null, {
							data: args[0] === 'first' ? 'test2' : 'test1'
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

							pageRenderer.render(renderingParameters,
								function (error) {
									if (error) {
										assert.fail(error);
									}
									assert.strictEqual(order.length, 1);
									assert.strictEqual(order[0],
										'module_first');
									assert.strictEqual(
										window.document.body.innerHTML,
										expected);

									order = [];
									pageRenderer.render(renderingParameters,
										function (error) {
											if (error) {
												assert.fail(error);
											}
											assert.strictEqual(order.length, 0);
											assert.strictEqual(
												window.document.body.innerHTML,
												expected);
											done();
										});
								});
						});
					}
				});
			});
	});
});

function createLocator() {
	var locator = new ServiceLocator(),
		modules = createModules(),
		moduleLoader = {
			getModulesByNames: function () {
				return modules;
			}
		};

	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('moduleLoader', moduleLoader);
	locator.register('logger', Logger);
	locator.register('stateProvider', StateProvider);
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
	return {
		module: {
			name: 'module',
			implementation: new UniversalMock(['render']),
			placeholders: {
				first: {
					name: 'first',
					moduleName: 'module',
					getTemplateStream: function (context) {
						return new ContentReadable(context.data);
					}
				},
				second: {
					name: 'second',
					moduleName: 'module',
					getTemplateStream: function (context) {
						var content = context.data + '<div id="module_first">';
						return new ContentReadable(content);
					}
				}
			}
		},
		module2: {
			name: 'module2',
			implementation: new UniversalMock(['render']),
			placeholders: {
				first: {
					name: 'first',
					moduleName: 'module2',
					getTemplateStream: function (context) {
						var content = context.data + '<div id="module_first">';
						return new ContentReadable(content);
					}
				},
				second: {
					name: 'second',
					moduleName: 'module2',
					getTemplateStream: function (context) {
						var content = context.data + '<div id="module2_first">';
						return new ContentReadable(content);
					}
				}
			}
		},
		moduleWithError: {
			name: 'moduleWithError',
			implementation: new UniversalMock(['render']),
			placeholders: {
				first: {
					name: 'first',
					moduleName: 'moduleWithError',
					getTemplateStream: function () {
						throw new Error('stream');
					}
				},
				__error: {
					name: '_lastError',
					moduleName: 'moduleWithError',
					getTemplateStream: function () {
						return new ContentReadable('error placeholder');
					}
				}
			}
		}
	};
}
