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
	Logger = require('../mocks/Logger'),
	UniversalMock = require('../mocks/UniversalMock'),
	ServiceLocator = require('catberry-locator'),
	FormSubmitter = require('../../browser/FormSubmitter');

global.Promise = require('promise');

describe('browser/FormSubmitter', function () {
	describe('#submit', function () {
		it('should submit specified form to module', function (done) {
			var locator = createLocator(),
				moduleLoader = locator.resolve('moduleLoader'),
				modules = moduleLoader.getModulesByNames(),
				form = '<form id="write-form" name="write_some"' +
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

						modules.module.implementation.once('submit',
							function (args) {
								var formName = args[0],
									formArgs = args[1];

								assert.strictEqual(
									formName, 'write_some', 'Wrong form name'
								);
								assert.strictEqual(
									formArgs.name, 'write_some',
									'Wrong form name'
								);
								assert.strictEqual(
									formArgs.element.attr('id'),
									'write-form', 'Wrong form id'
								);
								assert.strictEqual(
									formArgs.moduleName,
									'module', 'Wrong module name'
								);
								assert.strictEqual(
									formArgs.values.text,
									'test text', 'Wrong input value'
								);
							});
						formSubmitter.submit($('form[name="write_some"]'))
							.then(function () {
								done();
							},
							function (error) {
								done(error);
							});
					});
				}
			});
		});

		it('should fine handle error in module submit', function (done) {
			var locator = createLocator(),
				moduleLoader = locator.resolve('moduleLoader'),
				modules = moduleLoader.getModulesByNames(),
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
						modules.module.implementation.once('submit',
							function () {
								assert.fail('module should not submit data');
							});
						modules.moduleWithError.implementation
							.once('submit', function () {
								throw new Error('test');
							});
						formSubmitter.submit($('form[name="write_some"]'))
							.then(function () {
								assert.fail('Should be error');
								done();
							},
							function (error) {
								assert.strictEqual(
										error instanceof Error, true,
									'Should be error'
								);
								assert.strictEqual(error.message, 'test');
								done();
							});
					});
				}
			});
		});
		it('should re-render placeholders specified as data dependents',
			function (done) {
				var locator = createLocator(),
					moduleLoader = locator.resolve('moduleLoader'),
					apiProvider = locator.resolve('moduleApiProvider'),
					form = '<form name="write_some"' +
						'data-module="module" ' +
						'data-dependents="module_first&module_second">' +
						'<input type="text" name="text" value="test text">' +
						'<input type="submit" value="Submit">' +
						'</form>';

				jsdom.env({
					html: '<div id="form"></div>',
					done: function (errors, window) {
						prepareWindow(window, locator);
						var $ = locator.resolve('jQuery');
						$(function () {
							window.location.assign('http://' +
								'local' +
								'/some' +
								'?module_param1=test1' +
								'&module_param2=test2');
							$('#form').html(form);

							var formSubmitter =
								locator.resolveInstance(FormSubmitter);

							apiProvider.once('requestRefresh', function (args) {
								assert.strictEqual(args[0],
									'module',
									'Wrong module name');
								assert.strictEqual(args[1],
									'first',
									'Wrong placeholder name');
								apiProvider.once('requestRefresh',
									function (args) {
										assert.strictEqual(args[0],
											'module',
											'Wrong module name');
										assert.strictEqual(args[1],
											'second',
											'Wrong placeholder name');
									});
							});

							formSubmitter.submit($('form[name="write_some"]'))
								.then(function () {
									done();
								},
								function (error) {
									done(error);
								});
						});
					}
				});
			});
	});

	describe('#canSubmit', function () {
		it('should return true when form is valid and receiver is found',
			function (done) {
				var locator = createLocator(),
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
							var formSubmitter =
								locator.resolveInstance(FormSubmitter);
							$('#form').html(form);
							var canSubmit = formSubmitter
								.canSubmit($('form[name="write_some"]'));
							assert.strictEqual(canSubmit, true);
							done();
						});
					}
				});
			});
		it('should return false when module receiver is not found',
			function (done) {
				var locator = createLocator(),
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
							var formSubmitter =
								locator.resolveInstance(FormSubmitter);
							$('#form').html(form);
							var canSubmit = formSubmitter
								.canSubmit($('form[name="write_some"]'));
							assert.strictEqual(canSubmit, false);
							done();
						});
					}
				});
			});
		it('should return false when form name is not specified',
			function (done) {
				var locator = createLocator(),
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
							var formSubmitter =
								locator.resolveInstance(FormSubmitter);
							$('#form').html(form);
							var canSubmit = formSubmitter
								.canSubmit($('form[name="write_some"]'));
							assert.strictEqual(canSubmit, false);
							done();
						});
					}
				});
			});
	});
});

function createLocator() {
	var locator = new ServiceLocator(),
		modules = {
			module: {
				name: 'module',
				implementation: new UniversalMock(['render', 'submit']),
				placeholders: {
					first: {
						moduleName: 'module',
						name: 'first'
					},
					second: {
						moduleName: 'module',
						name: 'second'
					}
				}
			},
			moduleWithError: {
				name: 'moduleWithError',
				implementation: new UniversalMock(['render', 'submit'])
			}
		},
		moduleLoader = {
			getModulesByNames: function () {
				return modules;
			}
		};

	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.register('logger', Logger);
	locator.registerInstance('moduleLoader', moduleLoader);
	locator.registerInstance('moduleApiProvider',
		new UniversalMock(['requestRefresh']));
	return locator;
}

function prepareWindow(window, locator) {
	window.location.assign = window.location.replace;
	delete require.cache.jquery;
	var $ = require('jquery')(window);
	locator.registerInstance('window', window);
	locator.registerInstance('jQuery', $);
}