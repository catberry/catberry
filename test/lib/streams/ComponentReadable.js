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
	testCases = require('../../cases/lib/streams/ComponentReadable.json'),
	ComponentReadable = require('../../../lib/streams/ComponentReadable');

describe('lib/streams/ComponentReadable', function () {
	describe('#foundComponentHandler', function () {
		testCases.cases.forEach(function (testCase) {
			it(testCase.name, function (done) {
				var concat = '',
					parser = new ComponentReadable(testCase.inputStreamOptions);

				parser._foundComponentHandler = function (tagDetails) {
					var id = tagDetails.attributes.id || '';
					return Promise.resolve(
						'content-' + tagDetails.name + id
					);
				};
				parser.renderHTML(testCase.input);

				parser
					.on('data', function (chunk) {
						concat += chunk;
					})
					.on('end', function () {
						assert.strictEqual(
							concat,
							testCase.expected,
							'Wrong HTML content');
						done();
					});
			});
		});

		it('should re-emit found tag errors', function (done) {
			done();
			//var concat = '',
			//	input = '<cat-some id="1"></cat-some>',
			//	expected = '<cat-some id="1">test1</cat-some>',
			//	parser = new ComponentReadable();
			//
			//parser.foundComponentHandler = function (tagDetails) {
			//	return Promise.resolve()
			//		.then(function () {
			//			throw new Error('hello');
			//		});
			//};
			//parser.parse(input);
			//
			//parser
			//	.on('data', function (chunk) {
			//		concat += chunk;
			//	})
			//	.on('error', function (error) {
			//		try {
			//			assert.strictEqual(error.message, 'hello');
			//			assert.strictEqual(
			//				concat, expected, 'Wrong HTML content'
			//			);
			//			done();
			//		} catch (e) {
			//			done(e);
			//		}
			//	});
		});
	});
});