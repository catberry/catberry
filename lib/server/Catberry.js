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

module.exports = Catberry;

var util = require('util'),
	CatberryBase = require('../CatberryBase'),
	ServiceLocator = require('../ServiceLocator');

util.inherits(Catberry, CatberryBase);

/**
 * Creates new instance of server-side catberry.
 * @constructor
 * @extends CatberryBase
 */
function Catberry() {
	CatberryBase.call(this);
}

/**
 * Current request router.
 * @type {RequestRouter}
 * @private
 */
Catberry.prototype._router = null;

/**
 * Cleans all resources of all modules.
 * @param {Function} callback Callback on finish clean.
 */
Catberry.prototype.clean = function (callback) {
	var builder = this.locator.resolve('resourceBuilder');
	builder.once('cleaned', callback);
	builder.clean();
};

/**
 * Gets connect/express middle-ware.
 * @returns {Function} Middleware function.
 */
Catberry.prototype.getMiddleware = function () {
	this._router = this.locator.resolve('requestRouter');
	return this._router.route.bind(this._router);
};