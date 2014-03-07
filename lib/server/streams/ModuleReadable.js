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

module.exports = ModuleReadable;

var stream = require('stream'),
	util = require('util'),
	ContentReadable = require('./ContentReadable');

util.inherits(ModuleReadable, stream.Readable);

/**
 * Creates new instance of module placeholder rendering stream.
 * @param {Object} module Module which will render placeholder.
 * @param {Object} placeholder Placeholder to render.
 * @param {Object} parameters Set of request parameters.
 * @constructor
 */
function ModuleReadable(module, placeholder, parameters) {
	stream.Readable.call(this);

	this._placeholder = placeholder;
	this._parameters = parameters;
	this._module = module;
}

/**
 * If reading from this stream is ended this value is true.
 * @type {boolean}
 * @private
 */
ModuleReadable.prototype._finished = false;

/**
 * Current module to render placeholder.
 * @type {Object}
 * @private
 */
ModuleReadable.prototype._module = null;

/**
 * Current placeholder to render.
 * @type {Object}
 * @private
 */
ModuleReadable.prototype._placeholder = null;

/**
 * Current set of request parameters.
 * @type {Object}
 * @private
 */
ModuleReadable.prototype._parameters = null;

/**
 * Current content stream to pipe from module.
 * @type {ContentReadable}
 * @private
 */
ModuleReadable.prototype._contentStream = null;

/**
 * Renders placeholder in module and pushes result content to consumer.
 * @private
 */
ModuleReadable.prototype._read = function () {
	var self = this;

	if (this._finished) {
		this.push(null);
		return;
	}

	if (this._contentStream === null) {
		this._module.implementation.render(this._placeholder,
			this._parameters[this._module.name], function (error, content) {
				if (error || content.length === 0) {
					self.push(null);
					self._finished = true;
					return;
				}

				self._contentStream = new ContentReadable(content);
				self._contentStream.once('readable', function () {
					var chunk = self._contentStream.read();
					self.push(chunk);
				});
			});
	} else {
		this._contentStream.once('readable', function () {
			var chunk = self._contentStream.read();
			if (chunk === null) {
				self._finished = true;
			}
			self.push(chunk);
		});
	}
};