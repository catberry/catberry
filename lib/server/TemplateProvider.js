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

var util = require('util'),
	dust,
	dustLogHelper = require('../helpers/dustLogHelper');

/**
 * Creates new instance of template provider.
 * @param {dust} $dust Dust template engine.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @param {Logger} $logger Logger to log template registration.
 * @param {boolean} isRelease Determines if application in release mode.
 * @constructor
 */
function TemplateProvider($dust, $eventBus, $logger, isRelease) {
	this._eventBus = $eventBus;
	dust = $dust;
	dustLogHelper.replaceLogger($dust, $logger, isRelease);
}

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
TemplateProvider.prototype._eventBus = null;

/**
 * Compiles dust template source to function.
 * @param {string} source Dust template source.
 * @param {string} name Template name.
 * @returns {string} Compiled function source.
 */
TemplateProvider.prototype.compile = function (source, name) {
	return dust.compile(source, name);
};

/**
 * Registers and compiles source of template.
 * @param {string} name Template name.
 * @param {string} source Template source.
 */
TemplateProvider.prototype.registerSource = function (name, source) {
	var compiled = this.compile(source, name);
	dust.loadSource(compiled);
	this._eventBus.emit('templateRegistered', {
		name: name,
		source: source
	});
};

/**
 * Gets stream of specified template for rendering specified data.
 * @param {string} name Template name.
 * @param {Object} context Data context.
 * @returns {Stream} Rendering stream.
 */
TemplateProvider.prototype.getStream = function (name, context) {
	return dust.stream(name, context);
};