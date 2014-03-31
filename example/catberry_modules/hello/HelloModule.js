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

module.exports = HelloModule;

/**
 * Creates new instance of example module.
 * @param {Logger} $logger Injected logger instance.
 * @param {string} title Injected title value from config object.
 * @param {ExternalModule} $externalModule Injected instance of ExternalModule
 * registered in server.js and client.js scripts.
 * @constructor
 */
function HelloModule($logger, title, $externalModule) {
	this._title = title;
	this._logger = $logger;
	$externalModule.foo();
	$logger.info('HelloModule constructor');
}

/**
 * Current title of page.
 * @type {string}
 * @private
 */
HelloModule.prototype._title = '';

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
HelloModule.prototype._logger = null;

/**
 * Renders data to specified placeholder.
 * @param {string} placeholderName Name of placeholder to render.
 * @param {Object} args Set of request arguments specified for this module.
 * @param {Function} callback Callback to return data for rendering.
 */
HelloModule.prototype.render = function (placeholderName, args, callback) {
	switch (placeholderName) {
		case '__index':
			this._logger.trace('index placeholder render');
			// just render some data using template __index
			callback(null, {title: this._title});
			break;
		case 'hello-world':
			this._logger.trace('hello-world placeholder render');
			// again render some data using template hello-world
			callback(null, {who: args.who });
			break;
		case 'signature':
			this._logger.trace('signature placeholder render');
			// could check something and pass error
			if (!args.author) {
				callback(new Error('No author!'), null);
				return;
			}
			callback(null, {author: args.author });
			break;
		case 'subtitle':
			this._logger.trace('subtitle placeholder render');
			// could call some async operations, it's ok
			setTimeout(function () {
				callback(null, {});
			}, 2000);
			break;
		default:
			// and of course could throw some exceptions directly,
			// it will be passed to next connect/express middleware
			throw new Error('No such placeholder');
	}
};

HelloModule.prototype.handle = function (eventName, placeholder, callback) {
	// not used yet, but they should be
};

HelloModule.prototype.submit = function (formName, formObject, callback) {
	// not used yet, but they should be
};