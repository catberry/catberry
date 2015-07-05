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
	moduleHelper = require('../../../lib/helpers/moduleHelper');

global.Promise = require('promise');

describe('lib/helpers/moduleHelper', function () {
	describe('#getNameForErrorTemplate', function () {
		it('should return name with postfix', function () {
			var templateName = moduleHelper.getNameForErrorTemplate(
				'some'
			);
			assert.strictEqual(
				templateName,
				'some' + moduleHelper.COMPONENT_ERROR_TEMPLATE_POSTFIX
			);
		});
		it('should return empty string for null value', function () {
			var templateName = moduleHelper.getNameForErrorTemplate(null);
			assert.strictEqual(templateName, '');
		});
	});

	describe('#getCamelCaseName', function () {
		it('should convert name to camel case with prefix', function () {
			var badName = 'awesome-module_name',
				camelCaseName = moduleHelper.getCamelCaseName('some', badName);

			assert.strictEqual(camelCaseName, 'someAwesomeModuleName');
		});

		it('should convert name to camel without prefix', function () {
			var badName = 'awesome-module_name',
				camelCaseName1 = moduleHelper.getCamelCaseName(null, badName),
				camelCaseName2 = moduleHelper.getCamelCaseName('', badName);

			assert.strictEqual(camelCaseName1, 'awesomeModuleName');
			assert.strictEqual(camelCaseName2, 'awesomeModuleName');
		});

		it('should return string with prefix if input is in camel case',
			function () {
				var camelCaseName = moduleHelper.getCamelCaseName(
					'some', 'awesomeModuleName'
				);

				assert.strictEqual(camelCaseName, 'someAwesomeModuleName');
			});

		it('should return input string if input is in camel case',
			function () {
				var camelCaseName = moduleHelper.getCamelCaseName(
					null, 'awesomeModuleName'
				);

				assert.strictEqual(camelCaseName, 'awesomeModuleName');
			});

		it('should handle separators at the end',
			function () {
				var camelCaseName = moduleHelper.getCamelCaseName(
					null, 'awesome-module-name-'
				);

				assert.strictEqual(camelCaseName, 'awesomeModuleName');
			});

		it('should return empty string if input is empty', function () {
			var camelCaseName1 = moduleHelper.getCamelCaseName(null, null),
				camelCaseName2 = moduleHelper.getCamelCaseName('', '');

			assert.strictEqual(camelCaseName1, '');
			assert.strictEqual(camelCaseName2, '');
		});
	});

	describe('#getOriginalComponentName', function () {
		it('should return name without prefix', function () {
			var originalName = moduleHelper.getOriginalComponentName(
				moduleHelper.COMPONENT_PREFIX + 'some'
			);
			assert.strictEqual(originalName, 'some');
		});
		it('should return empty string for null value', function () {
			var originalName = moduleHelper.getOriginalComponentName(null);
			assert.strictEqual(originalName, '');
		});
	});

	describe('#getTagNameForComponentName', function () {
		it('should return name with prefix', function () {
			var tagName = moduleHelper.getTagNameForComponentName(
				'some'
			);
			assert.strictEqual(
				tagName, moduleHelper.COMPONENT_PREFIX.toUpperCase() + 'SOME'
			);
		});
		it('should return name without prefix for HEAD', function () {
			var tagName = moduleHelper.getTagNameForComponentName(
				'head'
			);
			assert.strictEqual(tagName, 'HEAD');
		});
		it('should return name HTML without prefix for document', function () {
			var tagName = moduleHelper.getTagNameForComponentName(
				'document'
			);
			assert.strictEqual(
				tagName, moduleHelper.DOCUMENT_ELEMENT_NAME.toUpperCase()
			);
		});
		it('should return empty string for null value', function () {
			var tagName = moduleHelper.getTagNameForComponentName(null);
			assert.strictEqual(tagName, '');
		});
	});

	describe('#getMethodToInvoke', function () {
		it('should find method in module', function () {
			var module = {
					someMethodToInvoke: function () {
						return 'hello';
					}
				},
				name = 'method-to-invoke',
				method = moduleHelper.getMethodToInvoke(module, 'some', name);

			assert.strictEqual(typeof(method), 'function');
			assert.strictEqual(method(), 'hello');
		});

		it('should find default method in module and pass name into it',
			function () {
				var name = 'method-to-invoke',
					module = {
						some: function (passedName) {
							assert.strictEqual(passedName, name);
							return 'hello';
						}
					},
					method = moduleHelper.getMethodToInvoke(
						module, 'some', name
					);

				assert.strictEqual(typeof(method), 'function');
				assert.strictEqual(method(), 'hello');
			});

		it('should return method with promise if do not find in module',
			function () {
				var module = {
					},
					name = 'method-to-invoke',
					method = moduleHelper.getMethodToInvoke(
						module, 'some', name
					);

				assert.strictEqual(typeof(method), 'function');
				assert.strictEqual(method() instanceof Promise, true);
			});

		it('should return method with promise if arguments are wrong',
			function () {
				var module = null,
					name = '',
					method = moduleHelper.getMethodToInvoke(
						module, 'some', name
					);

				assert.strictEqual(typeof(method), 'function');
				assert.strictEqual(method() instanceof Promise, true);
			});
	});
});
