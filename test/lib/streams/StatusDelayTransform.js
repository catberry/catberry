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
	stream = require('stream'),
	ContentReadable = require('../../../lib/streams/ContentReadable'),
	StatusDelayTransform = require('../../../lib/streams/StatusDelayTransform');

describe('lib/streams/StatusDelayTransform', function () {
	describe('#transform', function () {
		it('should properly pass all chunks of 1 byte size', function (done) {
			var content = '1234567890',
				result = '',
				options = {
					highWaterMark: 1
				},
				renderingContext = {
					isAnyComponentRendered: true
				},
				contentStream = new ContentReadable(content, options),
				transformStream = new StatusDelayTransform(
					renderingContext, options
				);

			contentStream
				.pipe(transformStream)
				.on('data', function (chunk) {
					result += chunk;
				})
				.on('end', function () {
					assert.equal(result, content);
					done();
				});
		});

		it('should properly delay chunks when is\'s needed', function (done) {
			var content = '1234567890',
				result = '',
				options = {
					highWaterMark: 1
				},
				countTransform = new stream.Transform(options),
				renderingContext = {
					isAnyComponentRendered: false
				},
				contentStream = new ContentReadable(content, options),
				transformStream = new StatusDelayTransform(
					renderingContext, options
				);

			countTransform._transform = function (chunk, encoding, callback) {
				if (chunk.toString() === '5') {
					renderingContext.isAnyComponentRendered = true;
				}
				callback(null, chunk);
			};

			var isFirstPartConsumed = false;
			contentStream
				.pipe(countTransform)
				.pipe(transformStream)
				.on('data', function (chunk) {
					assert.strictEqual(
						renderingContext.isAnyComponentRendered, true
					);
					if (!isFirstPartConsumed) {
						assert.strictEqual(chunk.toString(), '1234');
						isFirstPartConsumed = true;
					}
					result += chunk;
				})
				.on('end', function () {
					assert.equal(result, content);
					done();
				});
		});

		it('should properly pass all chunks of default size', function (done) {
			var content = '1234567890',
				result = '',
				renderingContext = {
					isAnyComponentRendered: true
				},
				contentStream = new ContentReadable(content),
				transformStream = new StatusDelayTransform(renderingContext);

			contentStream
				.pipe(transformStream)
				.on('data', function (chunk) {
					result += chunk;
				})
				.on('end', function () {
					assert.equal(result, content);
					done();
				});
		});
	});

	describe('#transform', function () {
		it('should properly flush all delayed chunks', function (done) {
			var content = '1234567890',
				result = '',
				renderingContext = {
					isAnyComponentRendered: false
				},
				contentStream = new ContentReadable(content),
				transformStream = new StatusDelayTransform(renderingContext);

			contentStream
				.pipe(transformStream)
				.on('data', function (chunk) {
					result += chunk;
				})
				.on('end', function () {
					assert.equal(result, content);
					done();
				});
		});
	});
});