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

module.exports = SourceFilterTransform;

var util = require('util'),
	stream = require('stream');

var FILTER_REGEXP =
		/\/\*\*\s*no-browser-bundle\s*\*\*\/(\s*)(.*)(require\s*\('[^']+'\))/m,
	REQUIRE_REPLACE = 'null';

util.inherits(SourceFilterTransform, stream.Transform);

/**
 * Creates new instance of source filter transform stream.
 * @constructor
 */
function SourceFilterTransform() {
	stream.Transform.call(this);
}

/**
 * Current code source file.
 * @type {string}
 * @private
 */
SourceFilterTransform.prototype._fileSource = '';

/**
 * Transforms next chunk of data.
 * @param {Buffer|string} chunk Chunk of data.
 * @param {string} encoding Encoding.
 * @param {Function} done Done callback.
 * @private
 */
SourceFilterTransform.prototype._transform = function (chunk, encoding, done) {
	this._fileSource += Buffer.isBuffer(chunk) ?
		chunk.toString() :
		chunk;
	done();
};

/**
 * Flushes all data to output.
 * @private
 */
SourceFilterTransform.prototype._flush = function () {
	this.push(this._fileSource.replace(FILTER_REGEXP,
			' $1$2' + REQUIRE_REPLACE));
	this.push(null);
};