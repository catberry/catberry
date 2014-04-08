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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	ContentReadable = require('../../../lib/server/streams/ContentReadable');

describe('server/streams/ContentReadable', function () {
	describe('#read', function () {
		it('should properly return all chunks of 1 byte size', function (done) {

			var content = '1234567890',
				counter = 0,
				contentStream = new ContentReadable(content, {
					highWaterMark: 1
				});

			contentStream.on('data', function (chunk) {
				assert.equal(chunk.toString(), content[counter]);
				counter++;
			});

			contentStream.on('end', function () {
				assert.equal(counter, content.length);
				done();
			});
		});

		it('should properly return all data at first time when buffer is big',
			function (done) {

				var content = '1234567890',
					counter = 0,
					contentStream = new ContentReadable(content, {
						highWaterMark: 1024
					});

				contentStream.on('data', function (chunk) {
					assert.equal(chunk.toString(), content);
					counter++;
				});

				contentStream.on('end', function () {
					assert.equal(counter, 1);
					done();
				});
			});
	});
});