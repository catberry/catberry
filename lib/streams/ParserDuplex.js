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

module.exports = ParserDuplex;

var stream = require('stream'),
	entities = require('entities'),
	util = require('util'),
	HTMLTagTokenizer = require('./HTMLTagTokenizer'),
	HTMLTokenizer = require('./HTMLTokenizer');

util.inherits(ParserDuplex, stream.Duplex);

var COMPONENT_TAG_NAME_REGEXP = /^cat-.+$/,
	HTML_ENTITY_REFERENCE_REGEXP = /\&#?\w+;/ig,
	RESERVED_TAGS = {
		document: true,
		head: true,
		body: true
	};

/**
 * Creates new instance of the parser duplex stream.
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
 * Current HTML tokenizer.
 * @type {HTMLTokenizer}
 * @private
 */
ParserDuplex.prototype._tokenizer = null;

/**
 * Current queue of found tags.
 * @type {Array}
 * @private
 */
ParserDuplex.prototype._tokenQueue = null;

/**
 * Is true if writing to this stream is over.
 * @type {boolean}
 * @private
 */
ParserDuplex.prototype._ended = false;

/**
 * Ends writing to this stream.
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
 * Handles found component tags.
 * @param {Object} tagDetails Object with tag details.
 * @returns {Readable|null} Replacement stream of HTML.
 * @abstract
 */
ParserDuplex.prototype.foundComponentHandler = function (tagDetails) {

};

/**
 * Handles specified error.
 * @param {Error} error Error object.
 * @protected
 */
ParserDuplex.prototype._handleError = function (error) {
	this.emit('error', error);
	this.end();
};

/**
 * Reads next chunk of data from this stream.
 * @private
 */
/*jshint maxcomplexity:false */
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
			var tagDetails = parseTag(tokenItem.value);

			if (!tagDetails ||
				(!RESERVED_TAGS.hasOwnProperty(tagDetails.name) &&
				!COMPONENT_TAG_NAME_REGEXP.test(tagDetails.name))) {
				toPush += tokenItem.value;
				continue;
			}

			this._replaceStream = this._getReplaceStream(tagDetails);
			if (!this._replaceStream) {
				toPush += tokenItem.value;
				continue;
			}
			// we should open self-closed component tags
			// to set content into them
			if (tagDetails.isSelfClosed) {
				tokenItem.value = tokenItem.value.replace(/\/\w*>$/, '>');
			}

			toPush += tokenItem.value;
			break;
		}
	} while (this._tokenQueue.length > 0);

	this.push(toPush);
};

/**
 * Gets replacement stream for the component tag.
 * @param {Object} tagDetails Tag details object.
 * @returns {Readable|null} Stream for replacement or null.
 * @private
 */
ParserDuplex.prototype._getReplaceStream = function (tagDetails) {
	var self = this,
		stream = this.foundComponentHandler(tagDetails);
	if (!stream) {
		return null;
	}
	return stream
		.on('readable', this._replaceHandler.bind(this))
		.on('error', this._handleError.bind(this))
		.on('end', function () {
			if (tagDetails.isSelfClosed) {
				self.push('</' + tagDetails.name + '>');
			}
			self._replaceEndHandler();
		});
};

/**
 * Pushes next chunk from replacement stream.
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
 * Removes replacement stream from this instance.
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

		this._tokenQueue.push(tokenDescriptor);
	}

	if (this._tokenQueue.length > 0) {
		this.read(0);
	}

	callback();
};

/**
 * Parses entire HTML tag.
 * @param {String} tagString Found tag token.
 * @returns {Object} Tag details.
 */
function parseTag(tagString) {
	var tokenizer = new HTMLTagTokenizer(tagString),
		lastAttributeName = '',
		current, currentString,
		tag = {
			name: '',
			attributes: Object.create(null),
			isSelfClosed: false
		};
	while (true) {
		current = tokenizer.next();
		switch (current.state) {
			case HTMLTagTokenizer.STATES.TAG_NAME:
				tag.name = tagString
					.substring(current.start, current.end)
					.toLocaleLowerCase();
				break;
			case HTMLTagTokenizer.STATES.ATTRIBUTE_NAME:
				currentString = tagString
					.substring(current.start, current.end)
					.toLocaleLowerCase();
				tag.attributes[currentString] = true;
				lastAttributeName = currentString;
				break;
			case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
			case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED:
			case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_UNQUOTED:
				currentString = tagString
					.substring(current.start, current.end)
					.replace(HTML_ENTITY_REFERENCE_REGEXP, entities.decode);
				tag.attributes[lastAttributeName] = currentString;
				break;
			case HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE:
				tag.isSelfClosed = true;
				break;
			case HTMLTagTokenizer.STATES.TAG_CLOSE:
				return tag;
			case HTMLTagTokenizer.STATES.ILLEGAL:
				return null;
		}
	}
}