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

module.exports = ContextFactory;

var propertyHelper = require('./helpers/propertyHelper');

/**
 * Creates new instance of context factory.
 * @param {ModuleApiProvider} $moduleApiProvider Module API.
 * @constructor
 */
function ContextFactory($moduleApiProvider) {
	this._moduleApiProvider = $moduleApiProvider;
}

/**
 * Current module API provider.
 * @type {ModuleApiProvider}
 * @private
 */
ContextFactory.prototype._moduleApiProvider = null;

/**
 * Creates new context for modules.
 * @param {Object} renderedData Set of last rendered data.
 * @param {Object} cookiesWrapper Cookie wrapper.
 * @param {Object} state Current state of all modules.
 * @param {Object} additional Additional parameters.
 * @param {String} additional.urlPath Current URL path.
 * @param {String} additional.referrer Current referrer.
 * @param {String} additional.userAgent Current user agent.
 */
ContextFactory.prototype.create =
	function (renderedData, cookiesWrapper, state, additional) {
		var context = Object.create(this._moduleApiProvider);
		context.renderedData = renderedData;
		context.state = state;
		context.cookies = cookiesWrapper;
		Object.keys(additional)
			.forEach(function (key) {
				propertyHelper.defineReadOnly(context, key, additional[key]);
			});
		return context;
	};