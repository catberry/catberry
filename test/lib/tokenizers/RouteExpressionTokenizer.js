'use strict';

const assert = require('assert');
const tests = require('../../cases/lib/tokenizers/RouteExpressionTokenizer.json');
const RouteExpressionTokenizer = require('../../../lib/tokenizers/RouteExpressionTokenizer');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/tokenizers/RouteExpressionTokenizer', function() {
	describe('#next', function() {
		tests.cases.forEach(testCase => {
			it(testCase.description, function(done) {
				const tokenizer = new RouteExpressionTokenizer();
				const tokens = [];

				tokenizer.setRouteExpression(testCase.parameterString);

				var next;
				do {
					next = tokenizer.next();
					tokens.push({
						name: findName(next.state),
						value: testCase.parameterString.substring(next.start, next.end)
					});
				} while (
				next.state !== RouteExpressionTokenizer.STATES.END &&
				next.state !== RouteExpressionTokenizer.STATES.ILLEGAL
					);
				assert.deepEqual(tokens, testCase.expected);
				done();
			});
		});
	});
});

function findName(state) {
	var name = '';
	Object.keys(RouteExpressionTokenizer.STATES)
		.some(key => {
			if (RouteExpressionTokenizer.STATES[key] === state) {
				name = key;
				return true;
			}

			return false;
		});
	return name;
}
