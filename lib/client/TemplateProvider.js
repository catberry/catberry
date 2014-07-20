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
	dustLogHelper = require('../helpers/dustLogHelper'),
	dust;

/**
 * Creates new instance of client-side template provider.
 * @param {Window} $window Window object.
 * @param {dust} $dust Dust template engine.
 * @param {Logger} $logger Logger to log registrations.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @constructor
 * @param {boolean} isRelease Current application mode.
 */
function TemplateProvider($window, $dust, $logger, $eventBus, isRelease) {
	this._eventBus = $eventBus;
	$window.dust = $dust;
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
 * Registers compiled source of template.
 * @param {string} name Template name.
 * @param {string} source Template compiled source.
 */
TemplateProvider.prototype.registerCompiled = function (name, source) {
	dust.loadSource(source);
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