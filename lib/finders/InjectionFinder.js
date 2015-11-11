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

module.exports = InjectionFinder;

var util = require('util');

var ARG_NAMES_NODE_NAME = 'argnames',
	COMMENTS_NODE_NAME = 'comments_before',
	START_NODE_NAME = 'start',
	END_NODE_NAME = 'end',
	PROPERTY_NODE_NAME = 'property',
	CONDITION_NODE_NAME = 'condition',
	KEYWORD_TYPE = 'keyword',
	OPERATOR_TYPE = 'operator',
	FUNCTION_KEYWORD = 'function',
	VAR_KEYWORD = 'var',
	SET_OPERATOR = '=',
	INJECTION_PREFIX = '$';

/**
 * Creates new instance of the dependency injection finder.
 * @constructor
 */
function InjectionFinder() { }

/**
 * Current processing stack.
 * @type {Array}
 * @private
 */
InjectionFinder.prototype._stack = null;

/**
 * Current result set.
 * @type {Object}
 * @private
 */
InjectionFinder.prototype._result = null;

/**
 * Finds names of all dependency injections used in source.
 * @param {Object} ast AST from UglifyJS.
 * @returns {Array<string>} List of names.
 */
InjectionFinder.prototype.find = function (ast) {
	this._stack = Object
		.keys(ast)
		.map(function (key) {
			return {
				key: key,
				value: ast[key]
			};
		});

	this._result = Object.create(null);
	var current = null;

	while (this._stack.length > 0) {
		current = this._stack.pop();
		if (current.key === ARG_NAMES_NODE_NAME) {
			this._argNamesHandler(current.value);
			continue;
		}

		if (util.isArray(current.value)) {
			this._arrayHandler(current.value);
			continue;
		}

		this._objectHandler(current.value);
	}
	return Object.keys(this._result);
};

/**
 * Handles "Function arguments" node from AST.
 * @param {Object} argNames AST node with function arguments.
 * @private
 */
InjectionFinder.prototype._argNamesHandler = function (argNames) {
	var areInjections = argNames.some(isInjection);

	if (!areInjections) {
		return;
	}

	argNames.forEach(this._addArgNameToResult, this);
};

/**
 * Add argument name to result set.
 * @param {Object} argName Argument name from AST.
 * @private
 */
InjectionFinder.prototype._addArgNameToResult = function (argName) {
	this._result[argName.name] = true;
};

/**
 * Adds inner key to queue.
 * @param {Object} value Current object from AST node.
 * @param {string} nextKey Object key to add to queue.
 * @private
 */
InjectionFinder.prototype._nextHandler = function (value, nextKey) {
	if (!value[nextKey] || typeof (value[nextKey]) !== 'object') {
		return;
	}
	if (nextKey === START_NODE_NAME ||
		nextKey === END_NODE_NAME ||
		nextKey === COMMENTS_NODE_NAME ||
		nextKey === CONDITION_NODE_NAME ||
		nextKey === PROPERTY_NODE_NAME
		) {
		return;
	}

	this._stack.push({
		key: nextKey,
		value: value[nextKey]
	});
};

/**
 * Handles "Array" node from AST.
 * @param {Array} array Array from AST node.
 * @private
 */
InjectionFinder.prototype._arrayHandler = function (array) {
	array.forEach(this._objectHandler, this);
};

/**
 * Handles "Object" node from AST.
 * @param {Object} object Object in AST node.
 * @private
 */
InjectionFinder.prototype._objectHandler = function (object) {
	if (!object || typeof (object) !== 'object') {
		return;
	}

	// anti-infinite loop protection
	if (object.isProcessedByCat) {
		return;
	}
	object.isProcessedByCat = true;

	if (object.start) {
		if (object.start.type === KEYWORD_TYPE &&
			object.start.value !== FUNCTION_KEYWORD &&
			object.start.value !== VAR_KEYWORD) {
			return;
		}
		if (object.start.type === OPERATOR_TYPE &&
			object.start.value !== SET_OPERATOR) {
			return;
		}
	}
	if (object.hasOwnProperty(OPERATOR_TYPE) &&
		object[OPERATOR_TYPE] !== SET_OPERATOR) {
		return;
	}
	Object
		.keys(object)
		.forEach(function (key) {
			this._nextHandler(object, key);
		}, this);
};

/**
 * Determines if the argument name from AST is a dependency injection.
 * @param {Object} argName Argument name from AST node.
 * @returns {boolean} Is argument injection.
 */
function isInjection(argName) {
	return (argName.name[0] === INJECTION_PREFIX);
}