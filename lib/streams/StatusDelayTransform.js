/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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

module.exports = StatusDelayTransform;

var util = require('util'),
	stream = require('stream');

util.inherits(StatusDelayTransform, stream.Transform);

/**
 * Creates new instance of status delay transformation stream.
 * @param {Object} renderingContext Context of rendering.
 * @param {Object?} options Stream options.
 * @constructor
 */
function StatusDelayTransform(renderingContext, options) {
	stream.Transform.call(this, options);
	this._renderingContext = renderingContext;
}

/**
 * Current context of rendering.
 * @type {Object}
 * @private
 */
StatusDelayTransform.prototype._renderingContext = null;

/**
 * Current HTML buffer.
 * @type {Buffer|null}
 * @private
 */
StatusDelayTransform.prototype._html = null;

/**
 * Transforms chunk of data.
 * @param {Buffer} data Chunk of data.
 * @param {String} encoding Chunk encoding.
 * @param {Function} callback Callback on ready to continue state.
 * @private
 */
StatusDelayTransform.prototype._transform =
	function (data, encoding, callback) {
		if (this._renderingContext.isAnyComponentRendered) {
			if (this._html) {
				this.push(this._html);
				this._html = null;
			}

			this.push(data);
			callback();
			return;
		}
		if (!this._html) {
			this._html = data;
		} else {
			this._html = Buffer.concat([this._html, data]);
		}

		callback();
	};

/**
 * Flushes the stream.
 * @param {Function} callback Callback on ready to continue state.
 * @private
 */
StatusDelayTransform.prototype._flush = function (callback) {
	if (this._html) {
		this.push(this._html);
		this._html = null;
	}
	callback();
};