'use strict';

const assert = require('assert');
const tests = require('../../cases/lib/streams/HTMLTagTokenizer.json');
const HTMLTagTokenizer = require('../../../lib/tokenizers/HTMLTagTokenizer');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/tokenizers/HTMLTagTokenizer', function() {
	describe('#next', function() {
		tests.cases.forEach(testCase => {
			it(testCase.description, function(done) {
				const tokenizer = new HTMLTagTokenizer();
				const tokens = [];

				tokenizer.setTagString(testCase.html);

				var next;
				do {
					next = tokenizer.next();
					tokens.push({
						name: findName(next.state),
						value: testCase.html.substring(next.start, next.end)
					});
				} while (
					next.state !== HTMLTagTokenizer.STATES.TAG_CLOSE &&
					next.state !== HTMLTagTokenizer.STATES.ILLEGAL
				);
				assert.deepEqual(tokens, testCase.expected);
				done();
			});
		});
	});
});

function findName(state) {
	var name = '';
	Object.keys(HTMLTagTokenizer.STATES)
		.some(key => {
			if (HTMLTagTokenizer.STATES[key] === state) {
				name = key;
				return true;
			}

			return false;
		});
	return name;
}
