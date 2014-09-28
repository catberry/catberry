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

var MODULE_CONTEXT_PREFIX_SEPARATOR = '_',
	ROOT_PLACEHOLDER_NAME = '__index',
	ERROR_PLACEHOLDER_NAME = '__error';

var methods = {

	/**
	 * Determines if specified placeholder name is a root placeholder name.
	 * @param {string} placeholderName Name of placeholder.
	 * @returns {boolean} True if specified placeholder is a root placeholder.
	 */
	isRootPlaceholder: function (placeholderName) {
		return placeholderName.toLowerCase() === ROOT_PLACEHOLDER_NAME;
	},

	/**
	 * Determines if specified placeholder name is a error placeholder name.
	 * @param {string} placeholderName Name of placeholder.
	 * @returns {boolean} True if specified placeholder is a error placeholder.
	 */
	isErrorPlaceholder: function (placeholderName) {
		return placeholderName.toLowerCase() === ERROR_PLACEHOLDER_NAME;
	},

	/**
	 * Gets method of module can to invoke.
	 * @param {Object} module Module implementation.
	 * @param {string} prefix Method prefix (render, handle, submit etc.)
	 * @param {string} name Name of entity to invoke method for.
	 * @returns {Function} Method to invoke.
	 */
	getMethodToInvoke: function (module, prefix, name) {
		if (!module || typeof(module) !== 'object') {
			return defaultPromiseMethod;
		}
		var pascalName = methods.getCamelCaseName(prefix, name);
		if (typeof(module[pascalName]) === 'function') {
			return module[pascalName].bind(module);
		}
		if (typeof(module[prefix]) === 'function') {
			return module[prefix].bind(module, name);
		}

		return defaultPromiseMethod;
	},

	/**
	 * Gets name in camel casing for everything.
	 * @param {string} prefix Prefix for name.
	 * @param {string} name Name to convert.
	 */
	getCamelCaseName: function (prefix, name) {
		if (!name) {
			return '';
		}
		var parts = name.split(/[^a-z0-9]/i),
			camelCaseName = String(prefix || '');

		parts.forEach(function (part) {
			if (!part) {
				return;
			}

			// first character in method name must be in lowercase
			camelCaseName += camelCaseName ?
				part[0].toUpperCase() :
				part[0].toLowerCase();
			camelCaseName += part.substring(1);
		});

		return camelCaseName;
	},

	/**
	 * Splits module name and some context
	 * (placeholder name, parameter name etc).
	 * @param {string} str Some string starting on module name.
	 * @returns {{moduleName: string, context: string}} Object with module name
	 * and context.
	 */
	splitModuleNameAndContext: function (str) {
		if (typeof(str) !== 'string') {
			return null;
		}
		var separatorIndex = str.indexOf(MODULE_CONTEXT_PREFIX_SEPARATOR);
		if (separatorIndex < 0) {
			return {
				moduleName: str,
				context: ''
			};
		}

		return {
			moduleName: str.substring(0, separatorIndex),
			context: str.substring(separatorIndex + 1)
		};
	},

	/**
	 * Returns joined module name and any context.
	 * @param {string} moduleName Name of module.
	 * @param {string} context Any context
	 * (placeholder name, parameter name etc).
	 * @returns {string} String like module-name_placeholder-name.
	 */
	joinModuleNameAndContext: function (moduleName, context) {
		return moduleName + MODULE_CONTEXT_PREFIX_SEPARATOR + context;
	}
};

module.exports = methods;

/**
 * Returns resolved promise.
 * @returns {Promise} Promise for nothing.
 */
function defaultPromiseMethod() {
	return Promise.resolve();
}