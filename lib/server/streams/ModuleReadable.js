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

module.exports = ModuleReadable;

var stream = require('stream'),
	util = require('util'),
	ContentReadable = require('./ContentReadable');

util.inherits(ModuleReadable, stream.PassThrough);

var ERROR_FORMAT = '%s<br/>%s';

/**
 * Creates new instance of module placeholder rendering stream.
 * @param {Object} module Module which will render placeholder.
 * @param {Object} placeholder Placeholder to render.
 * @param {Object} renderingParameters Rendering parameters.
 * @param {boolean} isRelease Is application mode release.
 * @constructor
 * @extends PassThrough
 */
function ModuleReadable(module, placeholder, renderingParameters, isRelease) {
	stream.PassThrough.call(this);

	this._placeholder = placeholder;
	this._parameters = renderingParameters;
	this._module = module;
	this._isRelease = Boolean(isRelease);
}

/**
 * Is current application mode release.
 * @type {boolean}
 * @private
 */
ModuleReadable.prototype._isRelease = false;

/**
 * If module rendering in progress this value is true.
 * @type {boolean}
 * @private
 */
ModuleReadable.prototype._rendering = false;

/**
 * Current module to render placeholder.
 * @type {Object}
 * @private
 */
ModuleReadable.prototype._module = null;

/**
 * Current placeholder to render.
 * @type {Object}
 * @private
 */
ModuleReadable.prototype._placeholder = null;

/**
 * Current rendering parameters.
 * @type {Object}
 * @private
 */
ModuleReadable.prototype._parameters = null;

/**
 * Renders module and pipes content stream into itself.
 */
ModuleReadable.prototype.render = function () {
	if (this._rendering) {
		return;
	}

	this._rendering = true;

	var self = this,
		implementationInContext = Object.create(this._module.implementation);

	implementationInContext.$context = {
		name: this._module.name,
		cookies: this._parameters.context.cookies,
		renderedData: this._parameters.context.renderedData,
		state: this._parameters.context.state[this._module.name] || {}
	};

	if (!(this._module.name in this._parameters.context.renderedData)) {
		this._parameters.context.renderedData[this._module.name] = {};
	}

	var moduleRenderedData =
		this._parameters.context.renderedData[this._module.name];

	try {
		implementationInContext.render(this._placeholder.name,
			function (error, dataContext, then) {
				then = typeof(then) === 'function' ? then : dummy;

				if (error) {
					self._errorHandler(error);
					then();
					return;
				}

				dataContext = dataContext || {};

				moduleRenderedData[self._placeholder.name] = dataContext;
				var contentStream =
					self._placeholder.getTemplateStream(dataContext);
				contentStream.on('error', function (error) {
					self.emit('error', error);
				});
				contentStream.on('end', then);
				contentStream.pipe(self);
			});
	} catch (e) {
		this._errorHandler(e);
	}
};

/**
 * Handles all errors.
 * @param {Error} error
 * @private
 */
ModuleReadable.prototype._errorHandler = function (error) {
	var self = this;
	setImmediate(function () {
		self.emit('error', error);
		// if application in debug mode then render
		// error text in placeholder
		if (!self._isRelease && error instanceof Error) {
			var errorStream = new ContentReadable(
				util.format(ERROR_FORMAT,
					error.message, error.stack));
			errorStream.pipe(self);
		} else if (self._module.errorPlaceholder) {
			var errorPlaceholderStream =
				self._module.errorPlaceholder.getTemplateStream(error);
			errorPlaceholderStream.pipe(self);
		} else {
			self.end();
		}
	});

};

/**
 * Does nothing as default callback.
 */
function dummy() {}