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
	moduleHelper = require('../helpers/moduleHelper'),
	errorHelper = require('../helpers/errorHelper');

util.inherits(ModuleReadable, stream.PassThrough);

var SCRIPT_TAG_REGEXP = /(<)(\/)?(script)(>)/ig,
	SCRIPT_TAG_REPLACEMENT = '&lt;$2$3&gt;',
	SCRIPT_REDIRECT_FORMAT = 'window.location.assign(\'%s\');',
	SCRIPT_SET_COOKIE_FORMAT = 'window.document.cookie = \'%s\';',
	SCRIPT_CLEAR_HASH_FORMAT = 'window.location.hash = \'\';',
	SCRIPT_SAVE_TO_CACHE_REPLACEMENT = 'if(!window.__cache)' +
		'{window.__cache = {};}' +
		'if(!window.__cache[\'__moduleName\'])' +
		'{window.__cache[\'__moduleName\'] = {};}' +
		'window.__cache[\'__moduleName\'][\'__placeholderName\']=__value;',
// element class is a marker for cleaning on DomReady event.
	SCRIPT_ELEMENT_FORMAT = '<' + 'script class="catberry-inline-script">' +
		'%s' +
		'</' + 'script>';

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
	var renderMethod = moduleHelper.getMethodToInvoke(
		implementationInContext,
		'render',
		this._placeholder.name
	);

	var promise;
	try {
		promise = Promise.resolve(renderMethod());
	} catch (e) {
		promise = Promise.reject(e);
	}

	promise.then(function (dataContext) {
		if (self._placeholder !== self._module.rootPlaceholder) {
			self.write(self.getInlineScript(dataContext));
		}

		dataContext = dataContext || {};

		moduleRenderedData[self._placeholder.name] = dataContext;
		var contentStream = self._placeholder.getTemplateStream(dataContext),
			startTime = Date.now();
		contentStream
			.on('error', function (error) {
				self._errorHandler(error);
			})
			.on('end', function () {
				eventArgs.time = Date.now() - startTime;
				self._parameters.eventBus.emit(
					'placeholderRendered', eventArgs
				);
			});

		contentStream.pipe(self);
	})
		.then(null, function (reason) {
			self._errorHandler(reason);
		});
};

/**
 * Handles all errors.
 * @param {Error} error Error object.
 * @private
 */
ModuleReadable.prototype._errorHandler = function (error) {
	this.emit('error', error);
	// if application in debug mode then render
	// error text in placeholder
	if (!this._isRelease && error instanceof Error) {
		this.write(errorHelper.prettyPrint(error,
			this._parameters.context.userAgent));
		this.end();
	} else if (this._module.errorPlaceholder) {
		var errorPlaceholderStream =
			this._module.errorPlaceholder.getTemplateStream(error);
		errorPlaceholderStream.pipe(this);
	} else {
		this.end();
	}
};

/**
 * Gets inline script for current rendering.
 * @returns {string} Script element with required code.
 */
ModuleReadable.prototype.getInlineScript = function (dataContext) {
	var scriptLines = '';

	if (dataContext) {
		try {
			scriptLines += SCRIPT_SAVE_TO_CACHE_REPLACEMENT
				.replace(/__moduleName/g, this._module.name)
				.replace(/__placeholderName/g, this._placeholder.name)
				.replace('__value', JSON.stringify(dataContext));
		} catch (e) {
			// nothing to do.
		}
	}

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

	scriptLines = scriptLines
		.replace(SCRIPT_TAG_REGEXP, SCRIPT_TAG_REPLACEMENT);
	return scriptLines ? util.format(SCRIPT_ELEMENT_FORMAT, scriptLines) : '';
};

/**
 * Escapes string for script inline formatting.
 * @param {string} str String to escape.
 */
function escapeString(str) {
	return str.replace(/['\\]/g, '\\$&');
}