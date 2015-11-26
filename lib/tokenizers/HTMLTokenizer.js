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

var STATES = {
	ILLEGAL: -1,
	INITIAL: 0,
	CONTENT: 1,
	COMPONENT: 2,
	COMMENT: 3,
	END: 4
};
HTMLTokenizer.STATES = STATES;

var COMPONENT_TAG_NAME_REGEXP = /^<((cat-)|((document|head|body)[\s/>]))/i,
	COMPONENT_NAME_MIN_LENGTH = 10;

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
HTMLTokenizer.prototype._currentState = STATES.INITIAL;

/**
 * Sets HTML string to the tokenizer.
 * @param {string} html HTML string.
 */
HTMLTokenizer.prototype.setHTMLString = function (html) {
	this._source = html;
	this._currentIndex = 0;
	this._currentState = STATES.INITIAL;
};

/**
 * Gets next token.
 * @returns {{state: number, value: string}} Token descriptor.
 */
HTMLTokenizer.prototype.next = function () {
	var start = this._currentIndex,
		state = this._currentState;

	switch (this._currentState) {
		case STATES.CONTENT:
			this.content();
			break;
		case STATES.COMPONENT:
			this.component();
			break;
		case STATES.COMMENT:
			this.comment();
			break;
		case STATES.END:
			return {
				state: state,
				value: null
			};
		case STATES.ILLEGAL:
			this._currentState = STATES.INITIAL;
			this._currentIndex++;
			break;
		default:
			this.initial();
			return this.next();
	}

	return {
		state: state,
		value: this._source.substring(start, this._currentIndex)
	};
};

/**
 * Switches machine to the "data" state.
 */
HTMLTokenizer.prototype.initial = function () {
	if (this._currentIndex >= this._source.length) {
		this._currentState = STATES.END;
		return;
	}

	// maybe comment or component
	if (this._source[this._currentIndex] === '<') {
		// comment
		if (this._source[this._currentIndex + 1] === '!') {
			if (this._source[this._currentIndex + 2] === '-' &&
				this._source[this._currentIndex + 3] === '-') {
				this._currentState = STATES.COMMENT;
				return;
			}

			this._currentState = STATES.CONTENT;
			return;
		}

		if (this.checkIfComponent()) {
			this._currentState = STATES.COMPONENT;
			return;
		}
	}

	this._currentState = STATES.CONTENT;
};

/**
 * Switches machine to the "tag" state.
 */
HTMLTokenizer.prototype.component = function () {
	this._currentIndex += 5;
	while (this._currentIndex < this._source.length) {
		if (this._source[this._currentIndex] === '>') {
			this._currentIndex++;
			this._currentState = STATES.INITIAL;
			return;
		}
		this._currentIndex++;
	}
	this._currentState = STATES.ILLEGAL;
};

/**
 * Switches machine to the "content" state.
 */
HTMLTokenizer.prototype.content = function () {
	this._currentIndex++;
	while (this._currentIndex < this._source.length) {
		if (this._source[this._currentIndex] === '<') {
			this._currentState = STATES.INITIAL;
			return;
		}
		this._currentIndex++;
	}
	this._currentState = STATES.END;
};

/**
 * Switches machine to the "comment" state.
 */
HTMLTokenizer.prototype.comment = function () {
	this._currentIndex += 4;

	while (this._currentIndex < this._source.length) {
		if (this._source[this._currentIndex] === '-') {
			if (this._currentIndex + 2 >= this._source.length) {
				this._currentState = STATES.ILLEGAL;
				return;
			}

			if (this._source[this._currentIndex + 1] === '-' &&
				this._source[this._currentIndex + 2] === '>') {
				this._currentIndex += 3;
				this._currentState = STATES.INITIAL;
				return;
			}
		}
		this._currentIndex++;
	}
	this._currentState = STATES.ILLEGAL;
};

/**
 * Checks if following HTML is a component.
 * @returns {boolean} Is it a component?
 */
HTMLTokenizer.prototype.checkIfComponent = function () {
	var testString = this._source.substr(
		this._currentIndex, COMPONENT_NAME_MIN_LENGTH
	);
	return COMPONENT_TAG_NAME_REGEXP.test(testString);
};