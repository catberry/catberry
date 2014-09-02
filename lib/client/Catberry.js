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
	ServiceLocator = require('catberry-locator');

var INLINE_SCRIPTS_CLASS = 'catberry-inline-script';

util.inherits(Catberry, CatberryBase);

/**
 * Creates new instance of client-side catberry.
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
 * Wraps current HTML document with catberry event handlers.
 */
Catberry.prototype.wrapDocument = function () {
	this._router = this.locator.resolve('requestRouter');
};

/**
 * Starts catberry application when document is ready.
 * @returns {Promise} Promise for nothing.
 */
Catberry.prototype.startWhenReady = function () {
	if (window.catberry) {
		return Promise.resolve();
	}
	var self = this,
		jQuery = this.locator.resolve('jQuery');
	// for jQuery plugins
	window.jQuery = window.$ = jQuery;
	return new Promise(function (fulfill) {
		jQuery(function () {
			jQuery('.' + INLINE_SCRIPTS_CLASS).remove();
			self.wrapDocument();
			window.catberry = self;
			fulfill();
		});
	});
};