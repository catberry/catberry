'use strict';

const assert = require('assert');
const errorHelper = require('../../../lib/helpers/errorHelper');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/helpers/errorHelper', function() {
	describe('#prettyPrint', function() {
		it('should return an empty string if the wrong error argument is specified', function() {
			const result = errorHelper.prettyPrint(null, null);
			assert.strictEqual(result, '');
		});
	});
});
