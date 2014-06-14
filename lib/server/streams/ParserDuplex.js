/* 
 * catberry
 *
 * Copyright (c) 2014 DenisRechkunov and project contributors.
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

module.exports = ParserDuplex;

var stream = require('stream'),
	util = require('util'),
	HTMLTokenizer = require('./HTMLTokenizer');

util.inherits(ParserDuplex, stream.Duplex);

var ERROR_SYNTAX = 'Syntax error, unexpected symbol "%s"',
	ID_ATTRIBUTE_REGEXP = /id="[\w-]+"/mi;

/**
 * Creates new instance of parser duplex stream.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends Duplex
 */
function ParserDuplex(options) {
	stream.Duplex.call(this, options);
	this._tokenQueue = [];
	this._tokenizer = new HTMLTokenizer();
}

/**
 * Current HTML tokenize.
 * @type {HTMLTokenizer}
 * @private
 */
ParserDuplex.prototype._tokenizer = null;

/**
 * Current found tag queue.
 * @type {Array}
 * @private
 */
ParserDuplex.prototype._tokenQueue = null;

/**
 * Is true if write to this stream is over.
 * @type {boolean}
 * @private
 */
ParserDuplex.prototype._ended = false;

/**
 * Ends write to this stream.
 */
ParserDuplex.prototype.end = function () {
	stream.Duplex.prototype.end.call(this);
	this._ended = true;
	this.read(0);
};

/**
 * Writes next chunk of data to this stream.
 * @param {Buffer|string} chunk Chunk of data.
 * @param {string} encoding Chunk encoding.
 * @param {Function} callback Callback to receive next chunk.
 * @private
 */
ParserDuplex.prototype._write = function (chunk, encoding, callback) {
	if (chunk.length === 0) {
		callback();
		return;
	}

	var chunkStr = Buffer.isBuffer(chunk) ? chunk.toString() : chunk;
	this._parseTokens(chunkStr, callback);
};

/**
 * Handles found tags with ID attribute.
 * @param {string} id Value of ID attribute.
 * @returns {Readable} Replace stream of HTML element content.
 * @abstract
 */
ParserDuplex.prototype.foundTagIdHandler = function (id) {
	return null;
};

/**
 * Handles specified error.
 * @param {Error} error Error object.
 * @private
 */
ParserDuplex.prototype._errorHandler = function (error) {
	this.emit('error', error);
};

/**
 * Reads next chunk of data from this stream.
 * @private
 */
ParserDuplex.prototype._read = function () {
	var self = this;
	if (this._replaceStream) {
		self.push('');
		return;
	}

	if (this._tokenQueue.length === 0) {
		if (this._ended) {
			this.push(null);
			return;
		}
		this.push('');
		return;
	}

	var toPush = '';
	do {
		var tokenItem = this._tokenQueue.shift();

		if (tokenItem.token === HTMLTokenizer.TOKENS.CONTENT_TOKEN ||
			tokenItem.token === HTMLTokenizer.TOKENS.COMMENT_TOKEN) {
			toPush += tokenItem.value;
			continue;
		}

		if (tokenItem.token === HTMLTokenizer.TOKENS.TAG_TOKEN) {
			toPush += tokenItem.value;
			var tagId = findTagId(tokenItem.value);
			if (!tagId) {
				continue;
			}
			this._replaceStream = this.foundTagIdHandler(tagId);
			if (this._replaceStream) {
				this._replaceStream.on('readable',
					this._replaceHandler.bind(this));
				this._replaceStream.on('end',
					this._replaceEndHandler.bind(this));
				break;
			}
		}
	} while (this._tokenQueue.length > 0);

	this.push(toPush);
};

/**
 * Pushes next chunk from replace stream.
 * @private
 */
ParserDuplex.prototype._replaceHandler = function () {
	var chunk;
	do {
		chunk = this._replaceStream.read();
		if (chunk === null) {
			break;
		}
	} while (this.push(chunk));
};

/**
 * Removes replace stream from this instance.
 * @private
 */
ParserDuplex.prototype._replaceEndHandler = function () {
	this._replaceStream = null;
	this.read(0);
};

/**
 * Parses all tokens in chunk.
 * @param {string} chunk Chunk of HTML.
 * @param {Function} callback Callback to receive next chunk of data.
 * @private
 */
ParserDuplex.prototype._parseTokens = function (chunk, callback) {
	this._tokenizer.appendChunk(chunk);
	var tokenDescriptor;
	while (true) {
		tokenDescriptor = this._tokenizer.getNext();
		if (!tokenDescriptor) {
			break;
		}
		if (tokenDescriptor.token === HTMLTokenizer.TOKENS.ERROR) {
			this._errorHandler(
				new Error(util.format(ERROR_SYNTAX, tokenDescriptor.value)));
			this._ended = true;
			this.read(0);
			break;
		}
		this._tokenQueue.push(tokenDescriptor);
	}

	if (this._tokenQueue.length > 0) {
		this.read(0);
	}

	callback();
};

/**
 * Finds ID attribute in HTML tag and gets its value.
 * @param {string} tag HTML tag.
 * @returns {string} ID attribute value.
 */
function findTagId(tag) {
	var searchResults = ID_ATTRIBUTE_REGEXP.exec(tag);
	if (!searchResults || searchResults.length === 0) {
		return null;
	}

	return searchResults[0]
		.split('=')[1]
		.replace(/"/g, '');
}