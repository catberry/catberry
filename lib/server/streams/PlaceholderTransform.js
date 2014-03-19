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

module.exports = PlaceholderTransform;

var util = require('util'),
	stream = require('stream'),
	ModuleReadable = require('./ModuleReadable'),
	ParserDuplex = require('./ParserDuplex');

util.inherits(PlaceholderTransform, ParserDuplex);

/**
 * Creates new instance of placeholder transformation stream.
 * @param {Object} context Rendering context.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends ParserDuplex
 */
function PlaceholderTransform(context, options) {
	ParserDuplex.call(this, options);

	this.renderedPlaceholders = {};
	this._context = context;
	if (!this._context.renderedPlaceholders) {
		this._context.renderedPlaceholders = {};
	}
}

/**
 * Current rendering context.
 * @type {Object}
 * @private
 */
PlaceholderTransform.prototype._context = null;

PlaceholderTransform.prototype.foundTagIdHandler = function (id) {
	if (!this._context.placeholdersByIds.hasOwnProperty(id) ||
		this._context.renderedPlaceholders.hasOwnProperty(id)) {
		return null;
	}

	this._context.renderedPlaceholders [id] = true;

	var placeholder = this._context.placeholdersByIds[id],
		moduleName = placeholder.moduleName,
		module = this._context.modulesByNames[moduleName],
		innerParser = new PlaceholderTransform(this._context),
		moduleStream = new ModuleReadable(module, placeholder,
			this._context.parameters);

	moduleStream.on('error', this._errorHandler.bind(this));
	innerParser.on('error', this._errorHandler.bind(this));
	moduleStream.render();

	return moduleStream.pipe(innerParser);
};