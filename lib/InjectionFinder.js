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

var ARGS_NODE_NAME = 'argnames',
	INJECTION_PREFIX = '$';

/**
 * Creates new instance of dependency injection finder.
 * @param {Object} ast AST of UglifyJS.
 * @constructor
 */
function InjectionFinder(ast) {
	this._stack = Object
		.keys(ast)
		.map(function (key) {
			return {
				key: key,
				value: ast[key]
			};
		});
}

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
 * @returns {Array<string>} List of names.
 */
InjectionFinder.prototype.find = function () {
	this._result = {};
	var current = null;

	while (this._stack.length > 0) {
		current = this._stack.pop();
		if (current.key === ARGS_NODE_NAME) {
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
 * Function argument names AST node handler.
 * @param {Object} argNames AST node with function arguments.
 * @private
 */
InjectionFinder.prototype._argNamesHandler = function (argNames) {
	var areInjections = false,
		names = argNames.map(function (argName) {
			if (argName.name[0] === INJECTION_PREFIX) {
				areInjections = true;
			}
			return argName.name;
		});

	if (!areInjections) {
		return;
	}
	names.forEach(function (name) {
		this._result[name] = true;
	}, this);
};

/**
 * Adds inner key to queue.
 * @param {Object} value Current object in AST node.
 * @param {string} nextKey Object key to add to queue.
 * @private
 */
InjectionFinder.prototype._nextHandler = function (value, nextKey) {
	if (!value[nextKey] || typeof(value[nextKey]) !== 'object') {
		return;
	}
	this._stack.push({
		key: nextKey,
		value: value[nextKey]
	});
};

/**
 * Handles array in AST.
 * @param {Array} array Array in AST node.
 * @private
 */
InjectionFinder.prototype._arrayHandler = function (array) {
	array.forEach(this._objectHandler, this);
};

/**
 * Handles object in AST.
 * @param {Object} object Object in AST node.
 * @private
 */
InjectionFinder.prototype._objectHandler = function (object) {
	if (!object || typeof(object) !== 'object') {
		return;
	}
	Object
		.keys(object)
		.forEach(function (key) {
			this._nextHandler(object, key);
		}, this);
};