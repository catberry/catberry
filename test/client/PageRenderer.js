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
	jsdom = require('jsdom'),
	ContentReadable = require('../../lib/server/streams/ContentReadable'),
	EventEmitter = require('events').EventEmitter,
	ModuleLoader = require('../mocks/ModuleLoader'),
	Logger = require('../mocks/Logger'),
	PageRenderer = require('../../lib/client/PageRenderer'),
	ServiceLocator = require('catberry-locator');

util.inherits(Module, EventEmitter);
util.inherits(ModuleWithError, EventEmitter);
function Module() {
	EventEmitter.call(this);
}
Module.prototype.render = function (placeholderName, parameters, callback) {
	var self = this;
	setImmediate(function () {
		self.emit('render', {
			placeholderName: placeholderName,
			parameters: parameters
		});
		callback(null, {data: parameters[placeholderName]});
	});
};

function ModuleWithError() {
	EventEmitter.call(this);
}
ModuleWithError.prototype.render =
	function (placeholderName, parameters, callback) {
		setImmediate(function () {
			callback(new Error('test'));
		});
	};

describe('client/PageRenderer', function () {
	describe('#renderPlaceholder', function () {
		it('should properly render placeholder on page',
			renderPlaceholderCase1);
		it('should properly render recursive placeholders on page',
			renderPlaceholderCase2);
		it('should properly render empty space when error while render',
			renderPlaceholderCase3);
		it('should properly render error placeholder when error while render',
			renderPlaceholderCase4);
	});

	describe('#renderModule', function () {
		it('should render module\'s placeholders in nesting order',
			renderModuleCase1);
		it('should re-render module\'s placeholders in nesting order',
			renderModuleCase2);
		it('should not re-render placeholder if module returns null as data',
			renderModuleCase3);
	});

	describe('#render', function () {
		it('should re-render module\'s placeholders only for changed parameters',
			renderCase1);
		it('should re-render all module\'s placeholders if global parameters',
			renderCase2);
	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger, config);
	locator.register('moduleLoader', ModuleLoader, config);
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
			implementation: new Module(),
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
			implementation: new Module(),
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
			implementation: new ModuleWithError(),
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

/**
 * Checks case when just render placeholder on page.
 * @param {Function} done Mocha done function.
 */
function renderPlaceholderCase1(done) {
	var page = '<div id="module_first"></div>',
		expected = '<div id="module_first">test1</div>',
		modules = createModules(),
		locator = createLocator({modules: modules});

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					rendered = {};
				pageRenderer.renderPlaceholder(
					modules.module.placeholders.first, {
						$$: {$context: {}},
						module: {first: 'test1'}
					}, rendered, function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(Object.keys(rendered).length, 1);
						assert.strictEqual('module_first' in rendered, true);
						assert.strictEqual(window.document.body.innerHTML,
							expected);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when render recursively placeholders on page.
 * @param {Function} done Mocha done function.
 */
function renderPlaceholderCase2(done) {
	var page = '<div id="module_second"></div>',
		expected = '<div id="module_second">test2' +
			'<div id="module_first">test1</div></div>',
		modules = createModules(),
		context = {},
		locator = createLocator({modules: modules});

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					rendered = {};
				pageRenderer.renderPlaceholder(
					modules.module.placeholders.second, {
						$$: {$context: context},
						module: {first: 'test1', second: 'test2'}
					}, rendered,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(Object.keys(rendered).length, 2);
						assert.strictEqual('module_first' in rendered, true);
						assert.strictEqual('module_second' in rendered, true);
						assert.deepEqual(context.module.first, {data: 'test1'});
						assert.deepEqual(context.module.second,
							{data: 'test2'});
						assert.strictEqual('module_second' in rendered, true);
						assert.strictEqual(window.document.body.innerHTML,
							expected);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when render error as empty space in placeholder.
 * @param {Function} done Mocha done function.
 */
function renderPlaceholderCase3(done) {
	var page = '<div id="moduleWithError_first"></div>',
		expected = '<div id="moduleWithError_first"></div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		});

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer, {
						isRelease: true
					}),
					rendered = {};
				pageRenderer.renderPlaceholder(
					modules.moduleWithError.placeholders.first, {
						$$: {$context: {}},
						moduleWithError: {first: 'test1'}
					}, rendered,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(Object.keys(rendered).length, 1);
						assert.strictEqual(
								'moduleWithError_first' in rendered, true);
						assert.strictEqual(
							window.document.body.innerHTML, expected);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when render error placeholder instead error in rendering.
 * @param {Function} done Mocha done function.
 */
function renderPlaceholderCase4(done) {
	var page = '<div id="moduleWithError_first"></div>',
		expected = '<div id="moduleWithError_first">error placeholder</div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		});

	modules.moduleWithError.errorPlaceholder =
		modules.moduleWithError.placeholders.__error;

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer, {
						isRelease: true
					}),
					rendered = {};
				pageRenderer.renderPlaceholder(
					modules.moduleWithError.placeholders.first, {
						$$: {$context: {}},
						moduleWithError: {first: 'test1'}
					}, rendered,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(Object.keys(rendered).length, 1);
						assert.strictEqual(
								'moduleWithError_first' in rendered, true);
						assert.strictEqual(
							window.document.body.innerHTML, expected);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when render placeholders in right nesting order on blank page.
 * @param {Function} done Mocha done function.
 */
function renderModuleCase1(done) {
	var page = '<div id="module2_second"></div>',
		expected = '<div id="module2_second">test1' +
			'<div id="module2_first">test2' +
			'<div id="module_first">test3' +
			'</div></div></div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		}),
		order = [];

	var moduleOld = modules.module.implementation.render;
	modules.module.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module_' + placeholderName);
			moduleOld.call(modules.module.implementation, placeholderName,
				args, callback);
		};
	var module2Old = modules.module2.implementation.render;
	modules.module2.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module2_' + placeholderName);
			module2Old.call(modules.module2.implementation, placeholderName,
				args, callback);
		};

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					rendered = {},
					additional = {$global: {}, $context: {}},
					parameters = Object.create(additional);
				parameters.$$ = additional;
				parameters.module = Object.create(additional.$global);
				parameters.module.$$ = additional;
				parameters.module.first = 'test3';
				parameters.module2 = Object.create(additional.$global);
				parameters.module2.$$ = additional;
				parameters.module2.first = 'test2';
				parameters.module2.second = 'test1';

				pageRenderer.renderModule(modules.module2,
					parameters, parameters, rendered,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(Object.keys(rendered).length, 3);
						assert.strictEqual(order.length, 3);
						assert.strictEqual(
								'module2_second' in rendered, true);
						assert.strictEqual(
								'module2_first' in rendered, true);
						assert.strictEqual(
								'module_first' in rendered, true);
						assert.strictEqual(order[0], 'module2_second');
						assert.strictEqual(order[1], 'module2_first');
						assert.strictEqual(order[2], 'module_first');
						assert.strictEqual(
							window.document.body.innerHTML, expected);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when render placeholders in right nesting order on filled page.
 * @param {Function} done Mocha done function.
 */
function renderModuleCase2(done) {
	var page = '<div id="module2_second">dummy' +
			'<div id="module2_first">dummy' +
			'<div id="module_first">dummy' +
			'</div></div></div>',
		expected = '<div id="module2_second">test1' +
			'<div id="module2_first">test2' +
			'<div id="module_first">test3' +
			'</div></div></div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		}),
		order = [];

	var moduleOld = modules.module.implementation.render;
	modules.module.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module_' + placeholderName);
			moduleOld.call(modules.module.implementation, placeholderName,
				args, callback);
		};
	var module2Old = modules.module2.implementation.render;
	modules.module2.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module2_' + placeholderName);
			module2Old.call(modules.module2.implementation, placeholderName,
				args, callback);
		};

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					rendered = {},
					additional = {$global: {}, $context: {}},
					parameters = Object.create(additional);
				parameters.$$ = additional;
				parameters.module = Object.create(additional.$global);
				parameters.module.$$ = additional;
				parameters.module.first = 'test3';
				parameters.module2 = Object.create(additional.$global);
				parameters.module2.$$ = additional;
				parameters.module2.first = 'test2';
				parameters.module2.second = 'test1';

				pageRenderer.renderModule(modules.module,
					parameters, parameters, rendered,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(Object.keys(rendered).length, 3);
						assert.strictEqual(order.length, 3);
						assert.strictEqual(
								'module2_second' in rendered, true);
						assert.strictEqual(
								'module2_first' in rendered, true);
						assert.strictEqual(
								'module_first' in rendered, true);
						assert.strictEqual(order[0], 'module2_second');
						assert.strictEqual(order[1], 'module2_first');
						assert.strictEqual(order[2], 'module_first');

						assert.strictEqual(
							window.document.body.innerHTML, expected);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when module cancel placeholder rendering and nothing is changed.
 * @param {Function} done Mocha done function.
 */
function renderModuleCase3(done) {
	var page = '<div id="module2_second">dummy' +
			'<div id="module2_first">dummy' +
			'<div id="module_first">dummy' +
			'</div></div></div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		});

	modules.module.implementation.render =
		function (placeholderName, args, callback) {
			callback(null, null);
		};
	modules.module2.implementation.render =
		function (placeholderName, args, callback) {
			callback(null, null);
		};

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					rendered = {},
					additional = {$global: {}, $context: {}},
					parameters = Object.create(additional);
				parameters.$$ = additional;
				parameters.module = Object.create(additional.$global);
				parameters.module.$$ = additional;
				parameters.module.first = 'test3';
				parameters.module2 = Object.create(additional.$global);
				parameters.module2.$$ = additional;
				parameters.module2.first = 'test2';
				parameters.module2.second = 'test1';

				pageRenderer.renderModule(modules.module,
					parameters, parameters, rendered,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(
							window.document.body.innerHTML, page);
						done();
					});
			});
		}
	});
}

/**
 * Checks case when render placeholders if parameters for module is changed.
 * @param {Function} done Mocha done function.
 */
function renderCase1(done) {
	var page = '<div id="module2_second">dummy' +
			'<div id="module2_first">dummy' +
			'<div id="module_first">dummy' +
			'</div></div></div>',
		expected = '<div id="module2_second">dummy' +
			'<div id="module2_first">dummy' +
			'<div id="module_first">test3' +
			'</div></div></div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		}),
		order = [];

	var moduleOld = modules.module.implementation.render;
	modules.module.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module_' + placeholderName);
			moduleOld.call(modules.module.implementation, placeholderName,
				args, callback);
		};
	var module2Old = modules.module2.implementation.render;
	modules.module2.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module2_' + placeholderName);
			module2Old.call(modules.module2.implementation, placeholderName,
				args, callback);
		};

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					additional = {$global: {}, $context: {}},
					parameters = Object.create(additional);
				parameters.$$ = additional;
				parameters.module = Object.create(additional.$global);
				parameters.module.$$ = additional;
				parameters.module.first = 'test3';

				pageRenderer.render(parameters,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(order.length, 1);
						assert.strictEqual(order[0], 'module_first');
						assert.strictEqual(
							window.document.body.innerHTML, expected);

						order = [];
						pageRenderer.render(parameters,
							function (error) {
								if (error) {
									assert.fail(error);
								}
								assert.strictEqual(order.length, 0);
								assert.strictEqual(
									window.document.body.innerHTML, expected);
								done();
							});
					});
			});
		}
	});
}

/**
 * Checks case when render all placeholders if global parameter is changed.
 * @param {Function} done Mocha done function.
 */
function renderCase2(done) {
	var page = '<div id="module2_second">dummy' +
			'<div id="module2_first">dummy' +
			'<div id="module_first">dummy' +
			'</div></div></div>',
		expected = '<div id="module2_second">undefined' +
			'<div id="module2_first">undefined' +
			'<div id="module_first">test3' +
			'</div></div></div>',
		modules = createModules(),
		locator = createLocator({
			modules: modules
		}),
		order = [];
	delete modules.moduleWithError;

	var moduleOld = modules.module.implementation.render;
	modules.module.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module_' + placeholderName);
			moduleOld.call(modules.module.implementation, placeholderName,
				args, callback);
		};
	var module2Old = modules.module2.implementation.render;
	modules.module2.implementation.render =
		function (placeholderName, args, callback) {
			order.push('module2_' + placeholderName);
			module2Old.call(modules.module2.implementation, placeholderName,
				args, callback);
		};

	jsdom.env({
		html: page,
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var pageRenderer = locator.resolveInstance(PageRenderer),
					additional = {$global: {test: 'test'}, $context: {}},
					parameters = Object.create(additional);
				parameters.$$ = additional;
				parameters.module = Object.create(additional.$global);
				parameters.module.$$ = additional;
				parameters.module.first = 'test3';

				pageRenderer.render(parameters,
					function (error) {
						if (error) {
							assert.fail(error);
						}
						assert.strictEqual(order.length, 3);
						assert.strictEqual(order[0], 'module2_second');
						assert.strictEqual(order[1], 'module2_first');
						assert.strictEqual(order[2], 'module_first');
						assert.strictEqual(
							window.document.body.innerHTML, expected);
						done();
					});
			});
		}
	});
}
