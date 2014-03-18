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

module.exports = PageRendererBase;

var MODULE_CONTEXT_PREFIX_SEPARATOR = '_';

/**
 * Creates new instance of base page renderer.
 * @param {ModuleLoader} $moduleLoader Module loader to get modules.
 * @constructor
 */
function PageRendererBase($moduleLoader) {
	this._modulesByNames = $moduleLoader.loadModules();
	this._initializeTemplates();
}

/**
 * Map of modules by names.
 * @type {Object}
 * @protected
 */
PageRendererBase.prototype._modulesByNames = null;

/**
 * Map of placeholders by ids.
 * @type {Object}
 * @protected
 */
PageRendererBase.prototype._placeholdersByIds = null;

/**
 * All placeholder element ids.
 * @type {Array<string>}
 * @protected
 */
PageRendererBase.prototype._placeholderIds = null;

/**
 * Initializes all templates data structures for fast access.
 */
PageRendererBase.prototype._initializeTemplates = function () {
	this._placeholdersByIds = {};
	this._placeholderIds = [];

	var currentPlaceholders;

	for (var moduleName in this._modulesByNames) {
		if (!this._modulesByNames.hasOwnProperty(moduleName)) {
			continue;
		}

		currentPlaceholders = this._modulesByNames[moduleName].placeholders;
		for (var placeholderName in currentPlaceholders) {
			if (!currentPlaceholders.hasOwnProperty(placeholderName)) {
				continue;
			}

			var id = moduleName +
				MODULE_CONTEXT_PREFIX_SEPARATOR + placeholderName;

			this._placeholderIds.push(id);
			this._placeholdersByIds[id] =
				currentPlaceholders[placeholderName];
		}
	}
};