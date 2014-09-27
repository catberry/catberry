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
	path = require('path'),
	fs = require('fs'),
	ContentReadable = require('../../../lib/streams/ContentReadable'),
	ParserDuplex = require('../../../lib/streams/ParserDuplex');

var casePath = path.join(__dirname, '..', '..', 'cases',
	'server', 'streams', 'ParserDuplex');

describe('lib/streams/ParserDuplex', function () {
	describe('#foundTagIdHandler', function () {
		it('should find HTML tags with ids and replace its content',
			function (done) {
				var concat = '',
					input = fs.createReadStream(
						path.join(casePath, 'case1', 'input.html')),
					expected = fs.readFileSync(
						path.join(casePath, 'case1', 'expected.html'), {
							encoding: 'utf8'
						}),
					parser = new ParserDuplex(),
					result = input.pipe(parser);

				parser.foundTagIdHandler = function (id) {
					return new ContentReadable('test' + id);
				};

				result
					.on('data', function (chunk) {
						concat += chunk;
					})
					.on('end', function () {
						assert.strictEqual(
							concat,
							expected,
							'Wrong HTML content');
						done();
					});
			});

		it('should properly skip HTML comments', function (done) {
			var concat = '',
				input = fs.createReadStream(
					path.join(casePath, 'case2', 'input.html')),
				expected = fs.readFileSync(
					path.join(casePath, 'case2', 'expected.html'), {
						encoding: 'utf8'
					}),
				parser = new ParserDuplex(),
				result = input.pipe(parser);

			parser.foundTagIdHandler = function (id) {
				return new ContentReadable('test' + id);
			};

			result
				.on('data', function (chunk) {
					concat += chunk;
				})
				.on('end', function () {
					assert.strictEqual(concat, expected, 'Wrong HTML content');
					done();
				});
		});

		it('should ignore incorrect HTML syntax', function (done) {
			var concat = '',
				input = fs.createReadStream(
					path.join(casePath, 'case3', 'input.html')),
				expected = fs.readFileSync(
					path.join(casePath, 'case3', 'expected.html'), {
						encoding: 'utf8'
					}),
				parser = new ParserDuplex(),
				result = input.pipe(parser);

			parser.foundTagIdHandler = function (id) {
				return new ContentReadable('test' + id);
			};

			result
				.on('data', function (chunk) {
					concat += chunk;
				})
				.on('end', function () {
					assert.strictEqual(concat, expected, 'Wrong HTML content');
					done();
				});
		});

		it('should properly work when tags do not fit in buffer',
			function (done) {
				var concat = '',
					input = fs.readFileSync(
						path.join(casePath, 'case4', 'input.html'), {
							encoding: 'utf8'
						}),
					expected = fs.readFileSync(
						path.join(casePath, 'case4', 'expected.html'), {
							encoding: 'utf8'
						}),
					parser = new ParserDuplex(),
					contentReadable = new ContentReadable(input, {
						highWaterMark: 2
					});
				parser.write('');
				var result = contentReadable.pipe(parser);

				parser.foundTagIdHandler = function (id) {
					return new ContentReadable('test' + id);
				};

				result
					.on('data', function (chunk) {
						concat += chunk;
					})
					.on('end', function () {
						assert.strictEqual(
							concat,
							expected,
							'Wrong HTML content');
						done();
					});
			});
	});
});