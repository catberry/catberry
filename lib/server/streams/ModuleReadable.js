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

var ERROR_FORMAT = '%s\n%s',
	SCRIPT_REDIRECT_FORMAT = 'window.location.assign(\'%s\');',
	SCRIPT_SET_COOKIE_FORMAT = 'window.document.cookie = \'%s\';',
	SCRIPT_CLEAR_HASH_FORMAT = 'window.location.hash = \'\';',
// element class is a marker for cleaning on DomReady event.
	SCRIPT_ELEMENT_FORMAT = '<script class="catberry-inline-script">' +
		'%s' +
		'</script>';

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
 * Current module context.
 * @type {Object}
 */
ModuleReadable.prototype._moduleContext = null;

/**
 * Renders module and pipes content stream into itself.
 */
ModuleReadable.prototype.render = function () {
	if (this._rendering) {
		return;
	}

	this._rendering = true;

	if (!this._module) {
		this.end();
		return;
	}

	var self = this,
		implementationInContext = Object.create(this._module.implementation);
	this._moduleContext = Object.create(this._parameters.context);
	this._moduleContext.name = this._module.name;
	this._moduleContext.state =
		this._parameters.context.state[this._module.name] || {};

	implementationInContext.$context = this._moduleContext;

	if (!(this._module.name in this._parameters.context.renderedData)) {
		this._parameters.context.renderedData[this._module.name] = {};
	}

	var moduleRenderedData =
		this._parameters.context.renderedData[this._module.name];

	var eventArgs = {
		name: this._placeholder.name,
		moduleName: this._module.name,
		context: implementationInContext.$context
	};
	this._parameters.eventBus.emit('placeholderRender', eventArgs);

	try {
		implementationInContext.render(this._placeholder.name,
			function (error, dataContext, then) {
				then = typeof(then) === 'function' ? then : dummy;

				if (self._placeholder !== self._module.rootPlaceholder) {
					self.write(self.getInlineScript());
				}
				if (error) {
					self._errorHandler(error);
					then();
					return;
				}

				dataContext = dataContext || {};

				moduleRenderedData[self._placeholder.name] = dataContext;
				var contentStream =
					self._placeholder.getTemplateStream(dataContext),
					startTime = Date.now();
				contentStream.on('error', function (error) {
					self.emit('error', error);
				});
				contentStream.on('end', function () {
					eventArgs.time = Date.now() - startTime;
					self._parameters.eventBus.emit(
						'placeholderRendered', eventArgs);
					then();
				});

				contentStream.pipe(self);
			});
	} catch (e) {
		this._errorHandler(e);
	}
};

/**
 * Handles all errors.
 * @param {Error} error Error object.
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
 * Gets inline script for current rendering.
 * @returns {string} Script element with required code.
 */
ModuleReadable.prototype.getInlineScript = function () {
	var scriptLines = '';

	this._moduleContext.cookies.setCookies.forEach(function (cookieSetup) {
		scriptLines += util.format(
			SCRIPT_SET_COOKIE_FORMAT,
			escapeString(cookieSetup)
		);
	});
	this._moduleContext.cookies.setCookies = [];

	if (this._moduleContext.redirectedTo) {
		scriptLines += util.format(
			SCRIPT_REDIRECT_FORMAT,
			escapeString(this._moduleContext.redirectedTo)
		);
		this._moduleContext.redirectedTo = null;
	}

	if (this._moduleContext.isHashCleared) {
		scriptLines += util.format(SCRIPT_CLEAR_HASH_FORMAT);
		this._moduleContext.isHashCleared = false;
	}

	return scriptLines ? util.format(SCRIPT_ELEMENT_FORMAT, scriptLines) : '';
};

/**
 * Escapes string for script inline formatting.
 * @param {string} str String to escape.
 */
function escapeString(str) {
	return str.replace(/['\\]/g, '\\$&');
}

/**
 * Does nothing as default callback.
 */
function dummy() {}