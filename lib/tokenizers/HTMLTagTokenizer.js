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
	TAG_OPEN: 1,
	TAG_NAME: 2,
	BEFORE_ATTRIBUTE_NAME: 3,
	ATTRIBUTE_NAME: 4,
	AFTER_ATTRIBUTE_NAME: 5,
	BEFORE_ATTRIBUTE_VALUE: 6,
	ATTRIBUTE_VALUE_DOUBLE_QUOTED: 7,
	ATTRIBUTE_VALUE_SINGLE_QUOTED: 8,
	ATTRIBUTE_VALUE_UNQUOTED: 9,
	AFTER_ATTRIBUTE_VALUE_QUOTED: 10,
	SELF_CLOSING_START_TAG_STATE: 11,
	TAG_CLOSE: 12
};
HTMLTagTokenizer.STATES = STATES;

var WHITESPACE_TEST = /^[\u0009\u000A\u000C\u000D\u0020]$/,
	ASCII_LETTERS_TEST = /[a-z]/i;

/**
 * Creates a new instance of HTML tag tokenizer.
 * It was developed using this specification:
 * http://www.w3.org/TR/2011/WD-html5-20110113/tokenization.html
 * @constructor
 */
function HTMLTagTokenizer() {}

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
 * Sets the tag string to tokenize.
 * @param {string} tagHTML Tag HTML string.
 */
HTMLTagTokenizer.prototype.setTagString = function (tagHTML) {
	this._source = tagHTML;
	this._currentIndex = 0;
	this._currentEnd = 0;
	this._currentState = STATES.NO;
};

/**
 * Gets next token in source.
 * @returns {{state: (number), start: number, end: number}}
 */
/*jshint maxcomplexity:false */
HTMLTagTokenizer.prototype.next = function () {
	var start = this._currentIndex,
		state = this._currentState;

	switch (this._currentState) {
		case STATES.TAG_OPEN:
			this.tagOpenState();
			break;
		case STATES.TAG_NAME:
			this.tagNameState();
			break;
		case STATES.SELF_CLOSING_START_TAG_STATE:
			this.selfClosingStartTagState();
			break;
		case STATES.BEFORE_ATTRIBUTE_NAME:
			this.beforeAttributeNameState();
			break;
		case STATES.ATTRIBUTE_NAME:
			this.attributeNameState();
			break;
		case STATES.AFTER_ATTRIBUTE_NAME:
			this.afterAttributeNameState();
			break;
		case STATES.BEFORE_ATTRIBUTE_VALUE:
			this.beforeAttributeValueState();
			break;
		case STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
			this.attributeValueDoubleQuotedState();
			break;
		case STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED:
			this.attributeValueSingleQuotedState();
			break;
		case STATES.ATTRIBUTE_VALUE_UNQUOTED:
			this.attributeValueUnquotedState();
			break;
		case STATES.AFTER_ATTRIBUTE_VALUE_QUOTED:
			this.afterAttributeValueQuotedState();
			break;
		case STATES.ILLEGAL:
		case STATES.TAG_CLOSE:
			return {
				state: state,
				start: start,
				end: start + 1
			};
		default:
			this._currentState = this._source[start] === '<' ?
				STATES.TAG_OPEN :
				STATES.ILLEGAL;
			return this.next();
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
		WHITESPACE_TEST.test(this._source[this._currentIndex])
	) {
		this._currentIndex++;
	}
};

/**
 * Describes the "Tag open state".
 */
HTMLTagTokenizer.prototype.tagOpenState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	var next = this._source[this._currentIndex];

	if (ASCII_LETTERS_TEST.test(next)) {
		this._currentState = STATES.TAG_NAME;
		return;
	}

	// this parser does not support the "Markup declaration open state" and
	// "End tag open state"
	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "Tag name state".
 */
HTMLTagTokenizer.prototype.tagNameState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	var next;
	while (this._currentIndex < this._source.length) {
		next = this._source[this._currentIndex];
		if (WHITESPACE_TEST.test(next)) {
			this._currentState = STATES.BEFORE_ATTRIBUTE_NAME;
			return;
		}

		if (next === '/') {
			this._currentState = STATES.SELF_CLOSING_START_TAG_STATE;
			return;
		}

		if (next === '>') {
			this._currentState = STATES.TAG_CLOSE;
			return;
		}

		if (next === '\u0000') {
			this._currentState = STATES.ILLEGAL;
			return;
		}

		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "Self-closing start tag state".
 */
HTMLTagTokenizer.prototype.selfClosingStartTagState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	var next = this._source[this._currentIndex];
	if (next === '>') {
		this._currentState = STATES.TAG_CLOSE;
		return;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "Before attribute value state".
 */
HTMLTagTokenizer.prototype.beforeAttributeNameState = function () {
	this._currentIndex++;
	this.skipWhitespace();
	this._currentEnd = this._currentIndex;

	var next = this._source[this._currentIndex];
	if (next === '/') {
		this._currentState = STATES.SELF_CLOSING_START_TAG_STATE;
		return;
	}
	if (next === '>') {
		this._currentState = STATES.TAG_CLOSE;
		return;
	}

	if (next === '\u0000' ||
		next === '"' ||
		next === '\'' ||
		next === '<' ||
		next === '=' ||
		this._currentIndex >= this._source.length) {
		this._currentState = STATES.ILLEGAL;
		return;
	}

	this._currentState = STATES.ATTRIBUTE_NAME;
};

/**
 * Describes the "Attribute name state".
 */
HTMLTagTokenizer.prototype.attributeNameState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	var next;
	while (this._currentIndex < this._source.length) {
		next = this._source[this._currentIndex];
		if (WHITESPACE_TEST.test(next)) {
			this._currentState = STATES.AFTER_ATTRIBUTE_NAME;
			return;
		}

		if (next === '/') {
			this._currentState = STATES.SELF_CLOSING_START_TAG_STATE;
			return;
		}

		if (next === '=') {
			this._currentState = STATES.BEFORE_ATTRIBUTE_VALUE;
			return;
		}

		if (next === '>') {
			this._currentState = STATES.TAG_CLOSE;
			return;
		}

		if (next === '\u0000' ||
			next === '"' ||
			next === '\'' ||
			next === '<') {
			this._currentState = STATES.ILLEGAL;
			return;
		}

		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "After attribute value state".
 */
HTMLTagTokenizer.prototype.afterAttributeNameState = function () {
	this._currentIndex++;
	this.skipWhitespace();
	this._currentEnd = this._currentIndex;
	var next = this._source[this._currentIndex];
	if (next === '/') {
		this._currentState = STATES.SELF_CLOSING_START_TAG_STATE;
		return;
	}
	if (next === '=') {
		this._currentState = STATES.BEFORE_ATTRIBUTE_VALUE;
		return;
	}
	if (next === '>') {
		this._currentState = STATES.TAG_CLOSE;
		return;
	}

	if (next === '\u0000' ||
		next === '"' ||
		next === '\'' ||
		next === '<' ||
		this._currentIndex >= this._source.length) {
		this._currentState = STATES.ILLEGAL;
		return;
	}

	this._currentState = STATES.ATTRIBUTE_NAME;
};

/**
 * Describes the "Before attribute value state".
 */
HTMLTagTokenizer.prototype.beforeAttributeValueState = function () {
	this._currentIndex++;
	this.skipWhitespace();
	this._currentEnd = this._currentIndex;
	var next = this._source[this._currentIndex];

	if (next === '"') {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
		this._currentState = STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED;
		return;
	}

	if (next === '\'') {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
		this._currentState = STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED;
		return;
	}

	if (next === '\u0000' ||
		next === '>' ||
		next === '<' ||
		next === '=' ||
		next === '`' ||
		this._currentIndex >= this._source.length) {
		this._currentState = STATES.ILLEGAL;
		return;
	}

	this._currentState = STATES.ATTRIBUTE_VALUE_UNQUOTED;
};

/**
 * Describes the "Attribute value (double-quoted) state".
 */
HTMLTagTokenizer.prototype.attributeValueDoubleQuotedState = function () {
	this._currentEnd = this._currentIndex;
	var next;
	while (this._currentIndex < this._source.length) {
		// character reference in attribute value state is not supported
		next = this._source[this._currentIndex];
		if (next === '"') {
			this._currentState = STATES.AFTER_ATTRIBUTE_VALUE_QUOTED;
			return;
		}

		if (next === '\u0000') {
			this._currentState = STATES.ILLEGAL;
			return;
		}

		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "Attribute value (single-quoted) state".
 */
HTMLTagTokenizer.prototype.attributeValueSingleQuotedState = function () {
	this._currentEnd = this._currentIndex;
	var next;
	while (this._currentIndex < this._source.length) {
		// character reference in attribute value state is not supported
		next = this._source[this._currentIndex];
		if (next === '\'') {
			this._currentState = STATES.AFTER_ATTRIBUTE_VALUE_QUOTED;
			return;
		}

		if (next === '\u0000') {
			this._currentState = STATES.ILLEGAL;
			return;
		}

		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "Attribute value (unquoted) state".
 */
HTMLTagTokenizer.prototype.attributeValueUnquotedState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	var next;
	while (this._currentIndex < this._source.length) {
		// character reference in attribute value state is not supported
		next = this._source[this._currentIndex];

		if (WHITESPACE_TEST.test(next)) {
			this._currentState = STATES.BEFORE_ATTRIBUTE_NAME;
			return;
		}

		if (next === '>') {
			this._currentState = STATES.TAG_CLOSE;
			return;
		}

		if (next === '\u0000' ||
			next === '\'' ||
			next === '<' ||
			next === '=' ||
			next === '`') {
			this._currentState = STATES.ILLEGAL;
			return;
		}

		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}

	this._currentState = STATES.ILLEGAL;
};

/**
 * Describes the "After attribute value (quoted) state".
 */
HTMLTagTokenizer.prototype.afterAttributeValueQuotedState = function () {
	this._currentIndex++;
	this._currentEnd = this._currentIndex;
	var next = this._source[this._currentIndex];

	if (WHITESPACE_TEST.test(next)) {
		this._currentState = STATES.BEFORE_ATTRIBUTE_NAME;
		return;
	}

	if (next === '/') {
		this._currentState = STATES.SELF_CLOSING_START_TAG_STATE;
		return;
	}

	if (next === '>') {
		this._currentState = STATES.TAG_CLOSE;
		return;
	}

	this._currentState = STATES.ILLEGAL;
};