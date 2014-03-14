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

module.exports = ResourceBuilder;

var gulp = require('gulp');

/**
 * Creates new instance of resource builder.
 * @param {TemplateProvider} $templateProvider Template provider
 * to compile templates.
 * @param {string} publicPath Path where to public all resources.
 * @constructor
 */
function ResourceBuilder($templateProvider, publicPath) {
	this._templateProvider = $templateProvider;
	this._publicPath = publicPath;
}

/**
 * Current public path.
 * @type {string}
 * @private
 */
ResourceBuilder.prototype._publicPath = '';

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ResourceBuilder.prototype._templateProvider = null;

/**
 * Builds all client-side resources and templates in public folder.
 * @param {Array} modulesByNames Modules array to build resources.
 */
ResourceBuilder.prototype.buildResources = function (modulesByNames) {
	// TODO build all resources using gulp tasks
};