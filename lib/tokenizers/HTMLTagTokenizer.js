'use strict';

const STATES = {
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
Object.freeze(STATES);

const WHITESPACE_TEST = /^[\u0009\u000A\u000C\u000D\u0020]$/;
const ASCII_LETTERS_TEST = /[a-z]/i;

class HTMLTagTokenizer {

	/**
	 * Creates a new instance of HTML tag tokenizer.
	 * It was developed using this specification:
	 * http://www.w3.org/TR/2011/WD-html5-20110113/tokenization.html
	 */
	constructor() {

		/**
		 * Current source code of constructor.
		 * @type {string}
		 * @private
		 */
		this._source = '';

		/**
		 * Current index in source code.
		 * @type {number}
		 * @private
		 */
		this._currentIndex = 0;

		/**
		 * Current index in source code.
		 * @type {number}
		 * @private
		 */
		this._currentEnd = 0;

		/**
		 * Current state.
		 * @type {number}
		 * @private
		 */
		this._currentState = STATES.NO;
	}

	/**
	 * Gets state constants map.
	 */
	static get STATES() {
		return STATES;
	}

	/**
	 * Sets the tag string to tokenize.
	 * @param {string} tagHTML Tag HTML string.
	 */
	setTagString(tagHTML) {
		this._source = tagHTML;
		this._currentIndex = 0;
		this._currentEnd = 0;
		this._currentState = STATES.NO;
	}

	/**
	 * Gets next token in source.
	 * @returns {{state: (number), start: number, end: number}}
	 */
	/* eslint complexity: 0 */
	next() {
		const start = this._currentIndex;
		const state = this._currentState;

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
					state,
					start,
					end: start + 1
				};
			default:
				this._currentState = this._source[start] === '<' ?
					STATES.TAG_OPEN :
					STATES.ILLEGAL;
				return this.next();
		}

		return {
			state,
			start,
			end: this._currentEnd
		};
	}

	/**
	 * Skips all whitespace characters.
	 */
	skipWhitespace() {
		while (
			this._currentIndex < this._source.length &&
			WHITESPACE_TEST.test(this._source[this._currentIndex])
		) {
			this._currentIndex++;
		}
	}

	/**
	 * Describes the "Tag open state".
	 */
	tagOpenState() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
		const next = this._source[this._currentIndex];

		if (ASCII_LETTERS_TEST.test(next)) {
			this._currentState = STATES.TAG_NAME;
			return;
		}

		// this parser does not support the "Markup declaration open state" and
		// "End tag open state"
		this._currentState = STATES.ILLEGAL;
	}

	/**
	 * Describes the "Tag name state".
	 */
	tagNameState() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
		while (this._currentIndex < this._source.length) {
			const next = this._source[this._currentIndex];
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
	}

	/**
	 * Describes the "Self-closing start tag state".
	 */
	selfClosingStartTagState() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
		const next = this._source[this._currentIndex];
		if (next === '>') {
			this._currentState = STATES.TAG_CLOSE;
			return;
		}

		this._currentState = STATES.ILLEGAL;
	}

	/**
	 * Describes the "Before attribute value state".
	 */
	beforeAttributeNameState() {
		this._currentIndex++;
		this.skipWhitespace();
		this._currentEnd = this._currentIndex;

		const next = this._source[this._currentIndex];
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
	}

	/**
	 * Describes the "Attribute name state".
	 */
	attributeNameState() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;

		while (this._currentIndex < this._source.length) {
			const next = this._source[this._currentIndex];
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
	}

	/**
	 * Describes the "After attribute value state".
	 */
	afterAttributeNameState() {
		this._currentIndex++;
		this.skipWhitespace();
		this._currentEnd = this._currentIndex;

		const next = this._source[this._currentIndex];
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
	}

	/**
	 * Describes the "Before attribute value state".
	 */
	beforeAttributeValueState() {
		this._currentIndex++;
		this.skipWhitespace();
		this._currentEnd = this._currentIndex;

		const next = this._source[this._currentIndex];

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
	}

	/**
	 * Describes the "Attribute value (double-quoted) state".
	 */
	attributeValueDoubleQuotedState() {
		this._currentEnd = this._currentIndex;

		while (this._currentIndex < this._source.length) {
			// character reference in attribute value state is not supported
			const next = this._source[this._currentIndex];
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
	}

	/**
	 * Describes the "Attribute value (single-quoted) state".
	 */
	attributeValueSingleQuotedState() {
		this._currentEnd = this._currentIndex;

		while (this._currentIndex < this._source.length) {
			// character reference in attribute value state is not supported
			const next = this._source[this._currentIndex];
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
	}

	/**
	 * Describes the "Attribute value (unquoted) state".
	 */
	attributeValueUnquotedState() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;

		while (this._currentIndex < this._source.length) {
			// character reference in attribute value state is not supported
			const next = this._source[this._currentIndex];

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
	}

	/**
	 * Describes the "After attribute value (quoted) state".
	 */
	afterAttributeValueQuotedState() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;

		const next = this._source[this._currentIndex];

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
	}
}

module.exports = HTMLTagTokenizer;
