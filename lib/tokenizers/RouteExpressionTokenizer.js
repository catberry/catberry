'use strict';

const STATES = {
	ILLEGAL: -1,
	NO: 0,
	PARAMETER_START: 1,
	PARAMETER_NAME: 2,
	STORE_LIST_START: 3,
	STORE_LIST_ITEM: 4,
	STORE_LIST_COMMA: 5,
	STORE_LIST_END: 6,
	TEXT: 7,
	END: 8
};
Object.freeze(STATES);

const PARAMETER_FIRST_REGEXP = /[$A-Z_]/i;
const PARAMETER_TAIL_REGEXP = /[$\w]/;
const STORE_NAME_REGEXP = /[\w$\/-]/;
const WHITESPACE_REGEXP = /\s/;

class RouteExpressionTokenizer {

	/**
	 * Creates a new instance of the route expression tokenizer.
	 */
	constructor() {

		/**
		 * Current source code of the route rule.
		 * @type {string}
		 * @private
		 */
		this._source = '';

		/**
		 * Current index in the route expression.
		 * @type {number}
		 * @private
		 */
		this._currentIndex = 0;

		/**
		 * Current token end index in the route expression.
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
	 * Gets the state constants map.
	 */
	static get STATES() {
		return STATES;
	}

	/**
	 * Sets the route expression string to tokenize.
	 * @param {string} routeExpression Route expression string.
	 */
	setRouteExpression(routeExpression) {
		this._source = routeExpression;
		this._currentIndex = 0;
		this._currentEnd = 0;
		this._currentState = STATES.NO;
	}

	/**
	 * Gets a next token in source.
	 * @returns {{state: (number), start: number, end: number}}
	 */
	/* eslint complexity: 0 */
	next() {
		const start = this._currentIndex;
		const state = this._currentState;

		switch (this._currentState) {
			case STATES.PARAMETER_START:
				this.parameterStartState();
				break;
			case STATES.PARAMETER_NAME:
				this.parameterNameState();
				break;
			case STATES.STORE_LIST_START:
				this.storeListStartState();
				break;
			case STATES.STORE_LIST_ITEM:
				this.storeListItemState();
				break;
			case STATES.STORE_LIST_COMMA:
				this.storeListCommaState();
				break;
			case STATES.STORE_LIST_END:
				this.storeListEndState();
				break;
			case STATES.TEXT:
				this.textState();
				break;
			case STATES.ILLEGAL:
			case STATES.END:
				return {
					state,
					start,
					end: start + 1
				};
			default:
				if (this._currentIndex === this._source.length) {
					this._currentState = STATES.END;
				} else if (this._source[start] === ':') {
					this._currentState = STATES.PARAMETER_START;
				} else {
					this._currentState = STATES.TEXT;
				}
				return this.next();
		}

		return {
			state,
			start,
			end: this._currentEnd
		};
	}

	/**
	 * Describes the PARAMETER_START state.
	 */
	parameterStartState() {
		this.toNextChar();

		if (this._currentIndex < this._source.length &&
			PARAMETER_FIRST_REGEXP.test(this._source[this._currentIndex])) {
			this._currentState = STATES.PARAMETER_NAME;
			return;
		}

		this._currentState = STATES.ILLEGAL;
	}

	/**
	 * Describes the PARAMETER_NAME state.
	 */
	parameterNameState() {
		this.toNextChar();

		while (this._currentIndex < this._source.length &&
					PARAMETER_TAIL_REGEXP.test(this._source[this._currentIndex])) {
			this.toNextChar();
		}

		if (this._source[this._currentIndex] === '[') {
			this._currentState = STATES.STORE_LIST_START;
			return;
		}

		if (this._currentIndex === this._source.length) {
			this._currentState = STATES.END;
			return;
		}

		this._currentState = STATES.TEXT;
	}

	/**
	 * Describes the STORE_LIST_START state.
	 */
	storeListStartState() {
		this.toNextChar();
		this.skipWhitespace();

		if (this._source[this._currentIndex] === ']') {
			this._currentState = STATES.STORE_LIST_END;
			return;
		}

		if (this._currentIndex < this._source.length &&
			STORE_NAME_REGEXP.test(this._source[this._currentIndex])) {
			this._currentState = STATES.STORE_LIST_ITEM;
			return;
		}

		this._currentState = STATES.ILLEGAL;
	}

	/**
	 * Describes the STORE_LIST_ITEM state.
	 */
	storeListItemState() {
		this.toNextChar();

		while (this._currentIndex < this._source.length &&
					STORE_NAME_REGEXP.test(this._source[this._currentIndex])) {
			this.toNextChar();
		}

		this.skipWhitespace();

		if (this._source[this._currentIndex] === ',') {
			this._currentState = STATES.STORE_LIST_COMMA;
			return;
		}

		if (this._source[this._currentIndex] === ']') {
			this._currentState = STATES.STORE_LIST_END;
			return;
		}

		this._currentState = STATES.ILLEGAL;
	}

	/**
	 * Describes the STORE_LIST_COMMA state.
	 */
	storeListCommaState() {
		this.toNextChar();
		this.skipWhitespace();

		if (this._currentIndex < this._source.length &&
			STORE_NAME_REGEXP.test(this._source[this._currentIndex])) {
			this._currentState = STATES.STORE_LIST_ITEM;
			return;
		}

		this._currentState = STATES.ILLEGAL;
	}

	/**
	 * Describes the STORE_LIST_END state.
	 */
	storeListEndState() {
		this.toNextChar();

		if (this._currentIndex === this._source.length) {
			this._currentState = STATES.END;
			return;
		}

		this._currentState = STATES.TEXT;
	}

	/**
	 * Describes the TEXT state.
	 */
	textState() {
		this.toNextChar();

		while (this._currentIndex < this._source.length &&
				this._source[this._currentIndex] !== ':') {
			this.toNextChar();
		}

		if (this._source[this._currentIndex] === ':') {
			this._currentState = STATES.PARAMETER_START;
			return;
		}

		this._currentState = STATES.END;
	}

	/**
	 * Skips all whitespace characters.
	 */
	skipWhitespace() {
		while (this._currentIndex < this._source.length &&
					WHITESPACE_REGEXP.test(this._source[this._currentIndex])) {
			this._currentIndex++;
		}
	}

	/**
	 * Moved pointer to the next char.
	 */
	toNextChar() {
		this._currentIndex++;
		this._currentEnd = this._currentIndex;
	}
}

module.exports = RouteExpressionTokenizer;
