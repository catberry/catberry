'use strict';

const UglifyJS = require('uglify-js');
const stream = require('stream');

class UglifyTransform extends stream.Transform {

	/**
	 * Creates a new instance of Uglify source code transform.
	 * @param {Object?} options Stream options.
	 */
	constructor(options) {
		super(options);

		/**
		 * Current source code accumulator.
		 * @type {string}
		 * @private
		 */
		this._sourceCode = '';
	}

	/**
	 * Transforms a chunk of data.
	 * @param {Buffer} chunk Stream chunk.
	 * @param {string} encoding Chunk buffer encoding.
	 * @param {Function} callback Chunk transform callback.
	 * @private
	 */
	_transform(chunk, encoding, callback) {
		this._sourceCode += chunk.toString();
		callback();
	}

	/**
	 * Flushes minified source code to the consumer.
	 * @param {Function} callback Flush callback.
	 * @private
	 */
	_flush(callback) {
		try {

			/* eslint new-cap: 0 */
			const compressor = UglifyJS.Compressor({
				warnings: false
			});

			var ast = UglifyJS.parse(this._sourceCode);

			ast.figure_out_scope();
			ast = ast.transform(compressor);
			ast.figure_out_scope();
			ast.mangle_names({
				toplevel: true
			});

			this.push(ast.print_to_string());
			callback();
		} catch (e) {
			this.emit('error', e);
		}
	}
}

module.exports = UglifyTransform;
