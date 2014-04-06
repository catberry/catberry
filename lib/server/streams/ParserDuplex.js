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
	util = require('util');

util.inherits(ParserDuplex, stream.Duplex);

var ID_ATTRIBUTE_REGEXP = /id="[\w-]+"/mi,
	CONTENT_TOKEN = 0,
	TAG_TOKEN = 1;

/**
 * Creates new instance of parser duplex stream.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends Duplex
 */
function ParserDuplex(options) {
	stream.Duplex.call(this, options);
	this._tagBuffer = '';
	this._tokenQueue = [];
}

/**
 * Current tag buffer.
 * @type {string}
 * @private
 */
ParserDuplex.prototype._tagBuffer = null;

/**
 * Is true if tag start was found and was not closed yet.
 * @type {boolean}
 * @private
 */
ParserDuplex.prototype._tagStarted = false;

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

		if (tokenItem.type === CONTENT_TOKEN) {
			toPush += tokenItem.token;
			continue;
		}

		if (tokenItem.type === TAG_TOKEN) {
			toPush += tokenItem.token;
			var tagId = findTagId(tokenItem.token);
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
	do {
		var tagBounds = findTag(chunk);

		if (tagBounds.start !== -1 && tagBounds.end !== -1 &&
			tagBounds.start < tagBounds.end) {
			// all stuff before put to send buffer
			if (tagBounds.start > 0) {
				this._tokenQueue.push({
					type: CONTENT_TOKEN,
					token: chunk.substring(0, tagBounds.start)
				});
			}
			// if found whole tag
			// put it to queue
			this._tokenQueue.push({
				type: TAG_TOKEN,
				token: chunk.substring(tagBounds.start, tagBounds.end + 1)
			});

			// set all stuff after tag to chunk for next iteration
			if (tagBounds.end < chunk.length) {
				chunk = chunk.substring(tagBounds.end + 1);
			}
		} else if (tagBounds.start !== -1) {
			// if found only start of tag
			this._tokenQueue.push({
				type: CONTENT_TOKEN,
				token: chunk.substring(0, tagBounds.start)
			});
			this._tagBuffer = chunk.substring(tagBounds.start);
			this._tagStarted = true;
			chunk = '';
		} else if (tagBounds.end !== -1) {
			// if found only end of tag
			var tag = String.concat(this._tagBuffer,
				chunk.substring(0, tagBounds.end + 1));
			this._tokenQueue.push({
				type: TAG_TOKEN,
				token: tag
			});
			this._tagStarted = false;
			chunk = chunk.substring(tagBounds.end + 1);
		} else {
			// no tag found
			// current chunk can be a middle part of tag
			if (this._tagStarted) {
				this._tagBuffer = String.concat(this._tagBuffer, chunk);
			} else {
				// or just another data, not a tag
				this._tokenQueue.push({
					type: CONTENT_TOKEN,
					token: chunk
				});
			}
			chunk = '';
		}
	} while (chunk.length > 0);

	if (this._tokenQueue.length > 0) {
		this.read(0);
	}

	callback();
};

/**
 * Finds HTML tag bounds.
 * @param {string} chunk Chunk of HTML.
 * @returns {{start: number, end: number}} Tag bounds in chunk.
 */
function findTag(chunk) {
	var startIndex = -1,
		endIndex = -1;

	// search tag start and end
	for (var i = 0; i < chunk.length; i++) {
		if (chunk[i] === '<') {
			startIndex = i;
		}

		if (chunk[i] === '>') {
			endIndex = i;
		}

		// if already found a tag then stop
		if (startIndex !== -1 && endIndex !== -1) {
			break;
		}
	}

	return {start: startIndex, end: endIndex};
}

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