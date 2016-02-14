/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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

var path = require('path');

module.exports = {
	/**
	 * Creates absolute path for require.
	 * @param {string} filename Path to file.
	 * @returns {string} Absolute path.
	 */
	getAbsoluteRequirePath: function(filename) {
		return process.cwd() + '/' + filename;
	},
	/**
	 * Clears node require cache by key.
	 * @param {string} key Cache key.
	 */
	clearCacheKey: function(key) {
		key = key || '';
		key = key.replace(/\\|\//g, path.sep);
		delete require.cache[key];
	},
	/**
	 * Gets valid require path replacing all backslashes with slashes.
	 * @param {string} path Path to file.
	 * @returns {string} Valid require path.
	 */
	getValidPath: function(path) {
		return typeof (path) === 'string' ? path.replace(/\\/g, '\\\\') : '';
	}
};
