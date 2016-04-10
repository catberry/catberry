'use strict';

const assert = require('assert');
const moduleHelper = require('../../../lib/helpers/moduleHelper');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/helpers/moduleHelper', function() {
	describe('#getNameForErrorTemplate', function() {
		it('should return a name with postfix', function() {
			const templateName = moduleHelper.getNameForErrorTemplate('some');
			assert.strictEqual(
				templateName, `some${moduleHelper.COMPONENT_ERROR_TEMPLATE_POSTFIX}`
			);
		});

		it('should return an empty string for a null value', function() {
			const templateName = moduleHelper.getNameForErrorTemplate(null);
			assert.strictEqual(templateName, '');
		});
	});

	describe('#getCamelCaseName', function() {
		it('should convert a name to the camel case with the prefix', function() {
			const badName = 'awesome-module_name';
			const camelCaseName = moduleHelper.getCamelCaseName('some', badName);

			assert.strictEqual(camelCaseName, 'someAwesomeModuleName');
		});

		it('should convert a name to the camel case without the prefix', function() {
			const badName = 'awesome-module_name';
			const camelCaseName1 = moduleHelper.getCamelCaseName(null, badName);
			const camelCaseName2 = moduleHelper.getCamelCaseName('', badName);

			assert.strictEqual(camelCaseName1, 'awesomeModuleName');
			assert.strictEqual(camelCaseName2, 'awesomeModuleName');
		});

		it('should return a string with the prefix if the input is in the camel case', function() {
			const camelCaseName = moduleHelper.getCamelCaseName('some', 'awesomeModuleName');
			assert.strictEqual(camelCaseName, 'someAwesomeModuleName');
		});

		it('should return an input string if the input is in the camel case', function() {
			const camelCaseName = moduleHelper.getCamelCaseName(null, 'awesomeModuleName');
			assert.strictEqual(camelCaseName, 'awesomeModuleName');
		});

		it('should handle separators at the end', function() {
			const camelCaseName = moduleHelper.getCamelCaseName(null, 'awesome-module-name-');
			assert.strictEqual(camelCaseName, 'awesomeModuleName');
		});

		it('should return an empty string if the input is empty', function() {
			const camelCaseName1 = moduleHelper.getCamelCaseName(null, null);
			const camelCaseName2 = moduleHelper.getCamelCaseName('', '');
			assert.strictEqual(camelCaseName1, '');
			assert.strictEqual(camelCaseName2, '');
		});
	});

	describe('#getOriginalComponentName', function() {
		it('should return a name without the prefix', function() {
			const originalName = moduleHelper.getOriginalComponentName(
				`${moduleHelper.COMPONENT_TAG_PREFIX}SOME`
			);
			assert.strictEqual(originalName, 'some');
		});

		it('should return an empty string for the null value', function() {
			const originalName = moduleHelper.getOriginalComponentName(null);
			assert.strictEqual(originalName, '');
		});
	});

	describe('#getTagNameForComponentName', function() {
		it('should return a name with the prefix', function() {
			const tagName = moduleHelper.getTagNameForComponentName('some');
			assert.strictEqual(
				tagName, `${moduleHelper.COMPONENT_TAG_PREFIX}SOME`
			);
		});

		it('should return a name without the prefix for HEAD', function() {
			const tagName = moduleHelper.getTagNameForComponentName('head');
			assert.strictEqual(tagName, 'HEAD');
		});

		it('should return a name "HTML" without the prefix for document', function() {
			const tagName = moduleHelper.getTagNameForComponentName('document');
			assert.strictEqual(
				tagName, moduleHelper.DOCUMENT_TAG_NAME
			);
		});

		it('should return an empty string for the null value', function() {
			const tagName = moduleHelper.getTagNameForComponentName(null);
			assert.strictEqual(tagName, '');
		});
	});

	describe('#getMethodToInvoke', function() {
		it('should find a method in the module', function() {
			const module = {
				someMethodToInvoke: () => 'hello'
			};
			const name = 'method-to-invoke';
			const method = moduleHelper.getMethodToInvoke(module, 'some', name);

			assert.strictEqual(typeof (method), 'function');
			assert.strictEqual(method(), 'hello');
		});

		it('should find a default method in the module and pass the name into it', function() {
			const name = 'method-to-invoke';
			const module = {
				some: passedName => {
					assert.strictEqual(passedName, name);
					return 'hello';
				}
			};
			const method = moduleHelper.getMethodToInvoke(module, 'some', name);

			assert.strictEqual(typeof (method), 'function');
			assert.strictEqual(method(), 'hello');
		});

		it('should return a method with a promise if the method is not found in the module', function() {
			const module = {};
			const name = 'method-to-invoke';
			const method = moduleHelper.getMethodToInvoke(module, 'some', name);

			assert.strictEqual(typeof (method), 'function');
			assert.strictEqual(method() instanceof Promise, true);
		});

		it('should return a method with a promise if arguments are wrong', function() {
			const module = null;
			const name = '';
			const method = moduleHelper.getMethodToInvoke(module, 'some', name);

			assert.strictEqual(typeof (method), 'function');
			assert.strictEqual(method() instanceof Promise, true);
		});
	});
});
