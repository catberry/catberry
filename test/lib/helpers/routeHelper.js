'use strict';

const assert = require('assert');
const testCases = require('../../cases/lib/helpers/routeHelper.json');
const routeHelper = require('../../../lib/helpers/routeHelper');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/helpers/routeHelper', function() {
	describe('#removeEndSlash', function() {
		testCases.removeEndSlash.forEach(testCase => {
			it(testCase.name, function() {
				const result = routeHelper.removeEndSlash(testCase.uri);
				assert.strictEqual(result, testCase.expected);
			});
		});
	});
});
