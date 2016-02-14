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

module.exports = LoaderBase;

/**
 * Create basic implementation of a module loader.
 * @param {Array} transforms Array of module transformations.
 * @constructor
 */
function LoaderBase(transforms) {
	this._transforms = transforms;
}

/**
 * Current list of component transforms.
 * @type {Array}
 * @private
 */
LoaderBase.prototype._transforms = null;

/**
 * Applies all transformations registered in Service Locator.
 * @param {Object} module Loaded module.
 * @param {number?} index Transformation index in a list.
 * @returns {Promise<Object>} Transformed module.
 * @protected
 */
LoaderBase.prototype._applyTransforms = function(module, index) {
	if (index === undefined) {
		// the list is a stack, we should reverse it
		index = this._transforms.length - 1;
	}

	if (index < 0) {
		return Promise.resolve(module);
	}

	var self = this,
		transformation = this._transforms[index];

	return Promise.resolve()
		.then(function() {
			return transformation.transform(module);
		})
		.then(function(transformedModule) {
			return self._applyTransforms(transformedModule, index - 1);
		});
};
