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
	moduleContextHelper = require('../../../lib/helpers/moduleContextHelper'),
	ContentStream = require('../../../lib/server/streams/ContentReadable'),
	CookiesWrapper = require('../../../lib/server/CookiesWrapper'),
	ServiceLocator = require('catberry-locator'),
	ModuleApiProvider = require('../../../lib/server/ModuleApiProvider'),
	ModuleReadable = require('../../../lib/server/streams/ModuleReadable');

describe('server/streams/ModuleReadable', function () {
	describe('#render', function () {
		it('should render script element if module called redirect',
			function (done) {
				var location = 'some/url',
					content = 'some test',
					module = {
						name: 'test',
						implementation: {
							render: function (name, callback) {
								this.$context.redirect(location);
								callback();
							}
						},
						placeholders: {
							test: {
								name: 'test',
								getTemplateStream: function () {
									return new ContentStream(content);
								}
							}
						}
					};

				var expected = '<script class="catberry-inline-script">' +
					'window.location.assign(\'' +
					location +
					'\');' +
					'</script>' +
					content;

				var parameters = createRenderingParameters(module),
					moduleReadable = new ModuleReadable(module,
						module.placeholders.test, parameters, false),
					result = '';

				moduleReadable.on('data', function (chunk) {
					result += chunk;
				});

				moduleReadable.on('end', function () {
					assert.strictEqual(result, expected);
					done();
				});
				moduleReadable.render();
			});

		it('should render script element if cookies.set was called',
			function (done) {
				var cookie1Name = 'cookie1',
					cookie1Value = 'value1',
					cookie2Name = 'cookie2',
					cookie2Value = 'value2',
					content = 'some test',
					module = {
						name: 'test',
						implementation: {
							render: function (name, callback) {
								this.$context.cookies.set({
									key: cookie1Name,
									value: cookie1Value
								});
								this.$context.cookies.set({
									key: cookie2Name,
									value: cookie2Value
								});
								callback();
							}
						},
						placeholders: {
							test: {
								name: 'test',
								getTemplateStream: function () {
									return new ContentStream(content);
								}
							}
						}
					};

				var expected = '<script class="catberry-inline-script">' +
					'window.document.cookie = \'' +
					cookie1Name + '=' + cookie1Value + '\';' +
					'window.document.cookie = \'' +
					cookie2Name + '=' + cookie2Value + '\';' +
					'</script>' +
					content;

				var parameters = createRenderingParameters(module),
					moduleReadable = new ModuleReadable(module,
						module.placeholders.test, parameters, false),
					result = '';

				moduleReadable.on('data', function (chunk) {
					result += chunk;
				});

				moduleReadable.on('end', function () {
					assert.strictEqual(result, expected);
					done();
				});
				moduleReadable.render();
			});

		it('should render script element if clearHash was called',
			function (done) {
				var content = 'some test',
					module = {
						name: 'test',
						implementation: {
							render: function (name, callback) {
								this.$context.clearHash();
								callback();
							}
						},
						placeholders: {
							test: {
								name: 'test',
								getTemplateStream: function () {
									return new ContentStream(content);
								}
							}
						}
					};

				var expected = '<script class="catberry-inline-script">' +
					'window.location.hash = \'\';' +
					'</script>' +
					content;

				var parameters = createRenderingParameters(module),
					moduleReadable = new ModuleReadable(module,
						module.placeholders.test, parameters, false),
					result = '';

				moduleReadable.on('data', function (chunk) {
					result += chunk;
				});

				moduleReadable.on('end', function () {
					assert.strictEqual(result, expected);
					done();
				});
				moduleReadable.render();
			});
	});
});

function createRenderingParameters(module) {
	var locator = new ServiceLocator();
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookiesWrapper', CookiesWrapper);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('eventBus', new events.EventEmitter());
	var modulesByNames = {};
	modulesByNames[module.name] = module;

	var placeholdersByIds = {};
	Object.keys(module.placeholders)
		.forEach(function (placeholderName) {
			var id = moduleContextHelper.joinModuleNameAndContext(
				module.name, placeholderName);
			placeholdersByIds[id] = module.placeholders[placeholderName];
		});

	var context = Object.create(locator.resolve('moduleApiProvider'));
	context.cookies = locator.resolve('cookiesWrapper');
	context.renderedData = {};
	context.state = {};

	return {
		isRelease: false,
		context: context,
		eventBus: locator.resolve('eventBus'),
		modulesByNames: modulesByNames,
		placeholderIds: Object.keys(placeholdersByIds),
		placeholdersByIds: placeholdersByIds
	};
}
