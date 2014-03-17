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

module.exports = TemplateProvider;

var dust = require('dustjs-linkedin'),
	path = require('path'),
	util = require('util'),
	fs = require('fs');

var ERROR_TEMPLATE_NOT_FOUND = 'Template "%s" not found',
	INFO_TEMPLATE_REGISTERED = 'Template "%s" from %s registered',
	INFO_TEMPLATE_UPDATED = 'Template "%s" from %s updated',
	DEFAULT_ENCODING = 'utf8';

/**
 * Creates new instance of template provider.
 * @param {string} encoding Encoding for streams.
 * @param {Logger} $logger Logger to log template registration.
 * @constructor
 */
function TemplateProvider(encoding, $logger) {
	this._logger = $logger;
	this._encoding = encoding || DEFAULT_ENCODING;
}

/**
 * Current instance of logger.
 * @type {Logger}
 * @private
 */
TemplateProvider.prototype._logger = null;

/**
 * Current encoding for template files.
 * @type {string}
 * @private
 */
TemplateProvider.prototype._encoding = '';

/**
 * Registers and compile template from specified path.
 * @param {string} name Template name.
 * @param {string} filename Template path.
 */
TemplateProvider.prototype.register = function (name, filename) {
	if (!fs.existsSync(filename)) {
		throw new Error(util.format(ERROR_TEMPLATE_NOT_FOUND, filename));
	}

	var self = this,
		source = fs.readFileSync(filename, {encoding: this._encoding});

	this._logger.info(util.format(INFO_TEMPLATE_REGISTERED, name, filename));
	dust.loadSource(dust.compile(source, name));

	var listener = function (current, previous) {
		if (previous.mtime === current.mtime) {
			return;
		}
		fs.readFile(filename, {encoding: self._encoding},
			function (error, content) {
				if (error) {
					fs.unwatchFile(filename, listener);
					return;
				}
				dust.loadSource(dust.compile(content, name));
				self._logger.info(util.format(INFO_TEMPLATE_UPDATED, name,
					filename));
			});
	};
	fs.watchFile(filename, listener);
};

/**
 * Gets stream of specified template rendering.
 * @param {string} name Template name.
 * @param {Object} context Data context.
 * @returns {Stream}
 */
TemplateProvider.prototype.getStream = function (name, context) {
	return dust.stream(name, context);
};