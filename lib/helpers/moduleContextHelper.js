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

var url = require('url');

var MODULE_CONTEXT_PREFIX_SEPARATOR = '_',
	ROOT_PLACEHOLDER_NAME = '__index',
	ERROR_PLACEHOLDER_NAME = '__error';

module.exports = {

	/**
	 * Determines if specified placeholder name is a root placeholder name.
	 * @param {string} placeholderName Name of placeholder.
	 * @returns {boolean}
	 */
	isRootPlaceholder: function (placeholderName) {
		return placeholderName.toLowerCase() === ROOT_PLACEHOLDER_NAME;
	},

	/**
	 * Determines if specified placeholder name is a error placeholder name.
	 * @param {string} placeholderName Name of placeholder.
	 * @returns {boolean}
	 */
	isErrorPlaceholder: function (placeholderName) {
		return placeholderName.toLowerCase() === ERROR_PLACEHOLDER_NAME;
	},

	/**
	 * Splits module name and some context (placeholder name, parameter name etc).
	 * @param {string} str Some string starting on module name.
	 * @returns {{moduleName: string, context: string}} Object with module name
	 * and context.
	 */
	splitModuleNameAndContext: function (str) {
		var separatorIndex = str.indexOf(MODULE_CONTEXT_PREFIX_SEPARATOR);
		if (separatorIndex < 1 && separatorIndex === str.length - 1) {
			return null;
		}

		return {
			moduleName: str.substring(0, separatorIndex),
			context: str.substring(separatorIndex + 1)
		};
	},

	/**
	 * Returns joined module name and any context.
	 * @param {string} moduleName Name of module.
	 * @param {string} context Any context (placeholder name, parameter name etc).
	 * @returns {string}
	 */
	joinModuleNameAndContext: function (moduleName, context) {
		return moduleName + MODULE_CONTEXT_PREFIX_SEPARATOR + context;
	}
};