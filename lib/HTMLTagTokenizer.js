/*
 * catberry-locator
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry-locator's license follows:
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
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * This license applies to all parts of catberry-locator that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = HTMLTagTokenizer;

var STATES = {
	ILLEGAL: -1,
	NO: 0,
	TAG_START: 1,
	TAG_END: 2,
	TAG_NAME: 3,
	ATTRIBUTE_NAME: 4,
	ATTRIBUTE_QUOTED_VALUE: 5,
	ATTRIBUTE_UNQUOTED_VALUE: 6,
	QUOTE_START: 7,
	QUOTE_END: 8,
	EQUAL: 9,
	END: 10
};
HTMLTagTokenizer.STATES = STATES;

var WHITESPACE_TEST = /^\s$/,
	QUOTE_TEST = /^["']$/,
	NAME_TEST = /^[^=\s"'<>\/]$/;

function HTMLTagTokenizer(tagHTML) {
	this._source = String(tagHTML || '');
}

/**
 * Current source code of constructor.
 * @type {string}
 * @private
 */
HTMLTagTokenizer.prototype._source = '';

/**
 * Current index in source code.
 * @type {number}
 * @private
 */
HTMLTagTokenizer.prototype._currentIndex = 0;

/**
 * Current index in source code.
 * @type {number}
 * @private
 */
HTMLTagTokenizer.prototype._currentEnd = 0;

/**
 * Current state.
 * @type {number}
 * @private
 */
HTMLTagTokenizer.prototype._currentState = STATES.NO;

/**
 * Gets next token in source.
 * @returns {{state: (number), start: number, end: number}}
 */
/*jshint maxcomplexity:false */
HTMLTagTokenizer.prototype.next = function () {
	if (this._currentState === STATES.ILLEGAL ||
		this._currentState === STATES.END) {
		return {
			state: this._currentState,
			start: this._currentIndex,
			end: this._currentState === STATES.END ?
				this._currentIndex :
				this._currentIndex + 1
		};
	}

	var start = this._currentIndex,
		state = this._currentState;

	switch (this._currentState) {
		case STATES.TAG_START:
			this.tagStartState();
			break;
		case STATES.TAG_END:
			this.tagEndState();
			break;
		case STATES.TAG_NAME:
			this.tagNameState();
			break;
		case STATES.ATTRIBUTE_NAME:
			this.attributeNameState();
			break;
		case STATES.ATTRIBUTE_QUOTED_VALUE:
			this.attributeQuotedValueState();
			break;
		case STATES.ATTRIBUTE_UNQUOTED_VALUE:
			this.attributeUnquotedValueState();
			break;
		case STATES.QUOTE_START:
			this.quoteStartState();
			break;
		case STATES.QUOTE_END:
			this.quoteEndState();
			break;
		case STATES.EQUAL:
			this.equalState();
			break;
		default:
			this.skipWhitespace();
			if (this._source[this._currentIndex] === '<') {
				this._currentState = STATES.TAG_START;
				return this.next();
			}
			if (this._currentIndex >= this._source.length) {
				state = STATES.END;
			} else {
				state = STATES.ILLEGAL;
				this._currentEnd = this._currentIndex + 1;
			}
	}

	return {
		state: state,
		start: start,
		end: this._currentEnd
	};
};

/**
 * Skips all whitespace characters.
 */
HTMLTagTokenizer.prototype.skipWhitespace = function () {
	while (
	this._currentIndex < this._source.length &&
	WHITESPACE_TEST.test(this._source[this._currentIndex])) {
		this._currentIndex++;
	}
};

/**
 * Describes EQUAL state of machine.
 */
HTMLTagTokenizer.prototype.equalState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	this.skipWhitespace();
	if (QUOTE_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.QUOTE_START;
		return;
	}

	if (this._currentIndex < this._source.length) {
		this._currentState = STATES.ATTRIBUTE_UNQUOTED_VALUE;
		return;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes TAG_NAME state of machine.
 */
HTMLTagTokenizer.prototype.tagNameState = function () {
	while (
	this._currentIndex < this._source.length &&
	NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentIndex++;
	}
	this._currentEnd = this._currentIndex;
	this.skipWhitespace();
	if (NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.ATTRIBUTE_NAME;
		return;
	}

	if(this._source[this._currentIndex] === '>') {
		this._currentState = STATES.TAG_END;
		return;
	}
	if (this._source[this._currentIndex] === '/') {
		var i = this._currentIndex;
		// jscs:disable requireCurlyBraces
		while (i < this._source.length && this._source[++i] !== '>');
		this._currentState = (i >= this._source.length) ?
			STATES.ILLEGAL :
			STATES.TAG_END;
		return;
	}
	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes TAG_START state of machine.
 */
HTMLTagTokenizer.prototype.tagStartState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	this.skipWhitespace();
	if (NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.TAG_NAME;
	} else {
		this._currentState = STATES.ILLEGAL;
	}
};

/**
 * Describes TAG_END state of machine.
 */
HTMLTagTokenizer.prototype.tagEndState = function () {
	if (this._source[this._currentIndex] === '/') {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}
	this.skipWhitespace();
	if (this._source[this._currentIndex] === '>') {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
		this._currentState = STATES.END;
		return;
	}
	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes ATTRIBUTE_NAME state of machine.
 */
HTMLTagTokenizer.prototype.attributeNameState = function () {
	while (
		this._currentIndex < this._source.length &&
		NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentIndex++;
	}
	this._currentEnd = this._currentIndex;
	this.skipWhitespace();
	if (this._source[this._currentIndex] === '=') {
		this._currentState = STATES.EQUAL;
		return;
	}

	if (NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.ATTRIBUTE_NAME;
		return;
	}

	if(this._source[this._currentIndex] === '>') {
		this._currentState = STATES.TAG_END;
		return;
	}
	if (this._source[this._currentIndex] === '/') {
		var i = this._currentIndex;
		// jscs:disable requireCurlyBraces
		while (i < this._source.length && this._source[++i] !== '>');
		this._currentState = (i >= this._source.length) ?
			STATES.ILLEGAL :
			STATES.TAG_END;
		return;
	}
	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes ATTRIBUTE_QUOTED_VALUE state of machine.
 */
HTMLTagTokenizer.prototype.attributeQuotedValueState = function () {
	while (this._currentIndex < this._source.length) {
		if (QUOTE_TEST.test(this._source[this._currentIndex]) &&
			this._source[this._currentIndex - 1] !== '\\') {
			break;
		}
		this._currentIndex++;
	}
	this._currentEnd = this._currentIndex;

	if (QUOTE_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.QUOTE_END;
		return;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes ATTRIBUTE_UNQUOTED_VALUE state of machine.
 */
HTMLTagTokenizer.prototype.attributeUnquotedValueState = function () {
	while (
	this._currentIndex < this._source.length &&
	this._source[this._currentIndex] !== ' ') {
		this._currentIndex++;
	}
	this._currentEnd = this._currentIndex;

	this.skipWhitespace();
	if(this._source[this._currentIndex] === '>') {
		this._currentState = STATES.TAG_END;
		return;
	}
	if (this._source[this._currentIndex] === '/') {
		var i = this._currentIndex;
		// jscs:disable requireCurlyBraces
		while (i < this._source.length && this._source[++i] !== '>');
		this._currentState = (i >= this._source.length) ?
			STATES.ILLEGAL :
			STATES.TAG_END;
		return;
	}
	if (NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.ATTRIBUTE_NAME;
		return;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes QUOTE_START state of machine.
 */
HTMLTagTokenizer.prototype.quoteStartState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	this._currentState = STATES.ATTRIBUTE_QUOTED_VALUE;
};

/**
 * Describes QUOTE_END state of machine.
 */
HTMLTagTokenizer.prototype.quoteEndState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	this.skipWhitespace();
	if(this._source[this._currentIndex] === '>') {
		this._currentState = STATES.TAG_END;
		return;
	}
	if (this._source[this._currentIndex] === '/') {
		var i = this._currentIndex;
		// jscs:disable requireCurlyBraces
		while (i < this._source.length && this._source[++i] !== '>');
		this._currentState = (i >= this._source.length) ?
			STATES.ILLEGAL :
			STATES.TAG_END;
		return;
	}
	if (NAME_TEST.test(this._source[this._currentIndex])) {
		this._currentState = STATES.ATTRIBUTE_NAME;
		return;
	}

	this._currentState = STATES.ILLEGAL;
};