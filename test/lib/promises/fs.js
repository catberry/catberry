'use strict';

const assert = require('assert');
const fs = require('../../../lib/promises/fs');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/promises/fs', function() {
	describe('#exists', function() {
		it('should determine that a file exists', function(done) {
			fs.exists(__filename)
				.then(isExists => assert.strictEqual(isExists, true))
				.then(done)
				.catch(done);
		});

		it('should determine that a file does not exist', function(done) {
			fs.exists(`${__filename}.never`)
				.then(isExists => assert.strictEqual(isExists, false))
				.then(done)
				.catch(done);
		});
	});
});
