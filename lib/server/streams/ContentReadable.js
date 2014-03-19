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

module.exports = ContentReadable;

var stream = require('stream'),
	util = require('util');

util.inherits(ContentReadable, stream.Readable);

/**
 * Creates new instance of content readable stream.
 * @param {string} content Text content.
 * @param {Object} options Stream options.
 * @constructor
 * @extends Readable
 */
function ContentReadable(content, options) {
	stream.Readable.call(this, options);
	this._buffer = new Buffer(content);
}

/**
 * Current content buffer.
 * @type {Buffer}
 * @private
 */
ContentReadable.prototype._buffer = null;

/**
 * Current position in buffer.
 * @type {number}
 * @private
 */
ContentReadable.prototype._currentIndex = 0;

/**
 * Reads next chunk of data from buffer and pushes it to consumer.
 * @param {number} byteLength Number of bytes to fetch.
 * @private
 */
ContentReadable.prototype._read = function (byteLength) {
	if (this._currentIndex >= this._buffer.length) {
		this.push(null);
		return;
	}

	var end, endIndex, chunk;
	do {
		end = this._currentIndex + byteLength;
		endIndex = end >= this._buffer.length ? this._buffer.length : end;
		chunk = this._buffer.slice(this._currentIndex, endIndex);
		this._currentIndex = endIndex;
	} while (this.push(chunk) && this._currentIndex < this._buffer.length);
};