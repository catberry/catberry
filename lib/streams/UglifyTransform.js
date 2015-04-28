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

module.exports = UglifyTransform;

var UglifyJS = require('uglify-js'),
	stream = require('stream'),
	util = require('util');

util.inherits(UglifyTransform, stream.Transform);

/**
 * Creates new instance of Uglify source code transform.
 * @param {ServiceLocator} $serviceLocator Stream options.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends Transform
 */
function UglifyTransform($serviceLocator, options) {
	stream.Transform.call(this, options);
	this._injectionFinder = $serviceLocator.resolve('injectionFinder');
}

/**
 * Current source code accumulator.
 * @type {string}
 * @private
 */
UglifyTransform.prototype._sourceCode = '';

/**
 * Current injection finder.
 * @type {InjectionFinder}
 * @private
 */
UglifyTransform.prototype._injectionFinder = null;

/**
 * Transforms a chunk of data.
 * @param {Buffer} chunk Stream chunk.
 * @param {string} encoding Chunk buffer encoding.
 * @param {Function} callback Chunk transoform callback.
 * @private
 */
UglifyTransform.prototype._transform = function (chunk, encoding, callback) {
	this._sourceCode += chunk.toString();
	callback();
};

/**
 * Flushes minified source code to the consumer.
 * @param {Function} callback Flush callback.
 * @private
 */
UglifyTransform.prototype._flush = function (callback) {
	try {
		var ast = UglifyJS.parse(this._sourceCode),
			compressor = UglifyJS.Compressor({warnings: false}),
			exceptNames = this._injectionFinder.find(ast);

		// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
		ast.figure_out_scope();
		ast = ast.transform(compressor);
		ast.figure_out_scope();
		ast.compute_char_frequency();
		ast.mangle_names({
			except: exceptNames,
			toplevel: true
		});

		this.push(ast.print_to_string());
		callback();
	} catch (e) {
		this.emit('error', e);
	}
};