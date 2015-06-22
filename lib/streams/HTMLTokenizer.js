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

module.exports = HTMLTokenizer;

HTMLTokenizer.TOKENS = {
	NONE: 0,
	CONTENT_TOKEN: 1,
	TAG_TOKEN: 2,
	COMMENT_TOKEN: 3
};

/**
 * Creates new instance of simplified streaming HTML tokenizer.
 * @constructor
 */
function HTMLTokenizer() {}

/**
 * Current token buffer.
 * @type {string}
 * @private
 */
HTMLTokenizer.prototype._source = '';

/**
 * Current index in buffer.
 * @type {number}
 * @private
 */
HTMLTokenizer.prototype._currentIndex = 0;

/**
 * Current token identifier.
 * @type {number}
 * @private
 */
HTMLTokenizer.prototype._currentToken = HTMLTokenizer.TOKENS.NONE;

/**
 * Is current state of machine finished or waiting for more chunks to finish.
 * @type {boolean}
 * @private
 */
HTMLTokenizer.prototype._stateFinished = false;

/**
 * Sets HTML string to the tokenizer.
 * @param {string} html HTML string.
 */
HTMLTokenizer.prototype.setHTMLString = function (html) {
	this._source = html;
	this._currentIndex = 0;
	this._currentToken = HTMLTokenizer.TOKENS.NONE;
	this._stateFinished = false;
};

/**
 * Gets next token.
 * @returns {{token: number, value: string}} Token descriptor.
 */
HTMLTokenizer.prototype.getNext = function () {
	// trying to restore previous state
	switch (this._currentToken) {
		case HTMLTokenizer.TOKENS.TAG_TOKEN:
			this.tag();
			break;
		case HTMLTokenizer.TOKENS.COMMENT_TOKEN:
			this.comment();
			break;
		default:
			// no previous state, start initial state
			this.initial();
	}

	// if whole token is there in buffer we finish state
	if (this._stateFinished) {
		var tokenDescriptor = {
			token: this._currentToken,
			value: this._source.substring(0, this._currentIndex)
		};
		this._stateFinished = false;
		this._currentToken = -1;
		this._source = this._source.substring(this._currentIndex);
		this._currentIndex = 0;

		return tokenDescriptor;
	}

	return null;
};

/**
 * Switches machine to the "data" state.
 */
HTMLTokenizer.prototype.initial = function () {
	if (this._currentIndex >= this._source.length) {
		return;
	}

	switch (this._source[this._currentIndex]) {
		case '<':
			this.tag();
			break;
		default:
			this.content();
	}
};

/**
 * Switches machine to the "tag" state.
 */
HTMLTokenizer.prototype.tag = function () {
	this._currentToken = HTMLTokenizer.TOKENS.TAG_TOKEN;

	if (this._source[this._currentIndex + 1] === '!') {
		if (this._currentIndex + 3 >= this._source.length) {
			return;
		}

		if (this._source[this._currentIndex + 2] === '-' &&
			this._source[this._currentIndex + 3] === '-') {
			this._currentIndex += 4;
			this.comment();
			return;
		}
	}

	while (this._currentIndex < this._source.length) {
		if (this._source[this._currentIndex] === '>') {
			this._currentIndex++;
			this._stateFinished = true;
			return;
		}
		this._currentIndex++;
	}
};

/**
 * Switches machine to the "content" state.
 */
HTMLTokenizer.prototype.content = function () {
	this._currentToken = HTMLTokenizer.TOKENS.CONTENT_TOKEN;

	while (this._currentIndex < this._source.length) {
		if (this._source[this._currentIndex] === '<') {
			this._stateFinished = true;
			return;
		}
		this._currentIndex++;
	}

	this._stateFinished = true;
};

/**
 * Switches machine to the "comment" state.
 */
HTMLTokenizer.prototype.comment = function () {
	this._currentToken = HTMLTokenizer.TOKENS.COMMENT_TOKEN;

	while (this._currentIndex < this._source.length) {
		if (this._source[this._currentIndex] === '-') {
			if (this._currentIndex + 2 >= this._source.length) {
				return;
			}

			if (this._source[this._currentIndex + 1] === '-' &&
				this._source[this._currentIndex + 2] === '>') {
				this._currentIndex += 3;
				this._stateFinished = true;
				return;
			}
		}
		this._currentIndex++;
	}
};