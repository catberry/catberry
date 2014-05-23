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
	util = require('util'),
	Logger = require('../mocks/Logger'),
	ServiceLocator = require('catberry-locator'),
	CookiesWrapper = require('../../lib/CookiesWrapper'),
	StateProvider = require('../../lib/client/StateProvider'),
	ModuleApiProvider = require('../../lib/client/ModuleApiProvider'),
	UrlMappingProvider = require('../../lib/UrlMappingProvider'),
	FormSubmitter = require('../../lib/client/FormSubmitter'),
	EventEmitter = require('events').EventEmitter,
	PageRenderer = require('../mocks/PageRenderer'),
	ModuleLoader = require('../mocks/ModuleLoader');

util.inherits(Module, EventEmitter);
util.inherits(ModuleWithError, EventEmitter);

function Module() {
	EventEmitter.call(this);
}
Module.prototype.submit = function (formName, formObject, callback) {
	var self = this;
	setImmediate(function () {
		self.emit('submit', {
			name: formName,
			object: formObject
		});
		callback();
	});
};

function ModuleWithError() {
	EventEmitter.call(this);
}
ModuleWithError.prototype.submit = function (formName, formObject, callback) {
	setImmediate(function () {
		callback(new Error('test'));
	});
};

describe('client/FormSubmitter', function () {
	describe('#submit', function () {
		it('should submit specified form to module', submitCase1);
		it('should fine handle error in module submit', submitCase2);
		it('should re-render placeholders specified as data dependents',
			submitCase3);
	});

	describe('#canSubmit', function () {
		it('should return true when form is valid and receiver is found',
			canSubmitCase1);
		it('should return false when module receiver is not found',
			canSubmitCase2);
		it('should return false when form name is not specified',
			canSubmitCase3);
	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger, config);
	locator.register('pageRenderer', PageRenderer, config);
	locator.register('moduleLoader', ModuleLoader, config);
	locator.register('urlMappingProvider', UrlMappingProvider, config);
	locator.register('moduleApiProvider', ModuleApiProvider, config);
	locator.register('cookiesWrapper', CookiesWrapper, config);
	locator.register('stateProvider', StateProvider, config);
	return locator;
}

function prepareWindow(window, locator) {
	window.location.assign = window.location.replace;
	delete require.cache.jquery;
	var $ = require('jquery')(window);
	locator.registerInstance('window', window);
	locator.registerInstance('jQuery', $);
}

/**
 * Checks case when submitted form should be passed to module.
 * @param {Function} done Mocha done function.
 */
function submitCase1(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		form = '<form name="write_some"' +
			'data-module="module">' +
			'<input type="text" name="text" value="test text">' +
			'<input type="submit" value="Submit">' +
			'</form>';
	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var formSubmitter = locator.resolveInstance(FormSubmitter);
				$('#form').html(form);
				modules.module.implementation.once('submit', function (data) {
					assert.strictEqual(data.name, 'write_some',
						'Wrong form name');
					assert.strictEqual(data.object.text, 'test text',
						'Wrong input value');
				});
				formSubmitter.submit($('form[name="write_some"]'),
					function (error) {
						if (error) {
							assert.fail(error);
						}
						done();
					});

			});
		}
	});
}

/**
 * Checks case when form submit causes error.
 * @param {Function} done Mocha done function.
 */
function submitCase2(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		form = '<form name="write_some"' +
			'data-module="moduleWithError">' +
			'<input type="text" name="text" value="test text">' +
			'<input type="submit" value="Submit">' +
			'</form>';
	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var formSubmitter = locator.resolveInstance(FormSubmitter);
				$('#form').html(form);
				modules.module.implementation.once('submit', function () {
					assert.fail('module should not submit data');
				});
				formSubmitter.submit($('form[name="write_some"]'),
					function (error) {
						assert.equal(error instanceof Error, true,
							'Should be error');
						done();
					});

			});
		}
	});
}

/**
 * Checks case when submitted form should be cause re-rendering.
 * @param {Function} done Mocha done function.
 */
function submitCase3(done) {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		form = '<form name="write_some"' +
			'data-module="module" ' +
			'data-dependents="module_first&module_second">' +
			'<input type="text" name="text" value="test text">' +
			'<input type="submit" value="Submit">' +
			'</form>',
		pageRenderer = new PageRenderer();

	locator.registerInstance('pageRenderer', pageRenderer);
	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var formSubmitter = locator.resolveInstance(FormSubmitter);
				window.location.assign(
					'http://local/some?module_param1=test1&module_param2=test2');
				$('#form').html(form);
				pageRenderer.on('renderPlaceholder', function (args) {
					assert.strictEqual(typeof(args.placeholder), 'object',
						'Placeholder should be object');
					assert.strictEqual(args.placeholder.moduleName, 'module',
						'Wrong module name');
					assert.strictEqual(args.placeholder.name === 'first' ||
							args.placeholder.name === 'second', true,
						'Wrong placeholder name');
					assert.strictEqual(typeof(args.parameters), 'object',
						'Parameters should be object');
					assert.strictEqual(args.parameters.module.param1, 'test1',
						'Wrong module parameter');
					assert.strictEqual(args.parameters.module.param2, 'test2',
						'Wrong module parameter');
				});
				formSubmitter.submit($('form[name="write_some"]'),
					function (error) {
						if (error) {
							assert.fail(error);
						}
						done();
					});

			});
		}
	});
}

/**
 * Checks case when form is valid to submit.
 */
function canSubmitCase1() {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		form = '<form name="write_some"' +
			'data-module="module">' +
			'<input type="text" name="text" value="test text">' +
			'<input type="submit" value="Submit">' +
			'</form>';

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var formSubmitter = locator.resolveInstance(FormSubmitter);
				$('#form').html(form);
				assert.strictEqual(
					formSubmitter.canSubmit($('form[name="write_some"]')),
					true);

			});
		}
	});
}

/**
 * Checks case when form is linked with undefined module.
 */
function canSubmitCase2() {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		form = '<form name="write_some"' +
			'data-module="notExist">' +
			'<input type="text" name="text" value="test text">' +
			'<input type="submit" value="Submit">' +
			'</form>';

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var formSubmitter = locator.resolveInstance(FormSubmitter);
				$('#form').html(form);
				assert.strictEqual(
					formSubmitter.canSubmit($('form[name="write_some"]')),
					false);

			});
		}
	});
}

/**
 * Checks case when form does not have a name.
 */
function canSubmitCase3() {
	var modules = createModules(),
		locator = createLocator({modules: modules}),
		form = '<form ' +
			'data-module="module">' +
			'<input type="text" name="text" value="test text">' +
			'<input type="submit" value="Submit">' +
			'</form>';

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				var formSubmitter = locator.resolveInstance(FormSubmitter);
				$('#form').html(form);
				assert.strictEqual(
					formSubmitter.canSubmit($('form[name="write_some"]')),
					false);

			});
		}
	});
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
					getTemplateStream: function () {}
				},
				second: {
					name: 'second',
					moduleName: 'module',
					getTemplateStream: function () {}
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
					getTemplateStream: function () {}
				},
				second: {
					name: 'second',
					moduleName: 'moduleWithError',
					getTemplateStream: function () {}
				}
			}
		}
	};
}