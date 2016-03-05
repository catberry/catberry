'use strict';

const assert = require('assert');
const promiseHelper = require('../../../lib/promises/promiseHelper');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/promises/promiseHelper', function() {
	describe('#callbackToPromise', function() {
		it('should convert a callback to a promise and pass the result', function(done) {
			const some = callback => setTimeout(() => callback(null, 'hello'), 10);

			promiseHelper.callbackToPromise(some)()
				.then(value => assert.strictEqual(value, 'hello'))
				.then(done)
				.catch(done);
		});

		it('should convert a callback to a promise and pass the error', function(done) {
			const some = callback => setTimeout(() => callback(new Error('hello')), 10);

			promiseHelper.callbackToPromise(some)()
				.then(() => assert.fail())
				.catch(reason => {
					assert.strictEqual(reason instanceof Error, true);
					assert.strictEqual(reason.message, 'hello');
				})
				.then(done)
				.catch(done);
		});
	});
});
