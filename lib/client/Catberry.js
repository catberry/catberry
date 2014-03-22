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
 */
Catberry.prototype.startWhenReady = function () {
	var self = this;
	var readyHandler = function () {
		if (window.document.readyState !== 'interactive' &&
			window.document.readyState !== 'complete') {
			return false;
		}

		if (!window.document.body) {
			return false;
		}

		self.wrapDocument();
		window.catberry = self;
		removeReadyHandler(readyHandler);
	};

	if (readyHandler()) {
		return;
	}

	subscribeOnReady(readyHandler);
};

/**
 * Removes handler from ready event.
 * @param {Function} handler Subscribed handler.
 */
function removeReadyHandler(handler) {
	// Mozilla, Opera, Chrome, Safari
	if (window.document.addEventListener) {
		window.document.removeEventListener('DOMContentLoaded', handler, false);
		// Despicable IE
	} else if (window.document.attachEvent) {
		window.document.detachEvent('onreadystatechange', handler);
	}
}

/**
 * Subscribes handler on document ready event.
 * @param {Function} handler Handler to subscribe.
 */
function subscribeOnReady(handler) {
	// Mozilla, Opera, Chrome, Safari
	if (window.document.addEventListener) {
		window.document.addEventListener('DOMContentLoaded', handler, false);
		// Despicable IE
	} else if (window.document.attachEvent) {
		window.document.attachEvent('onreadystatechange', handler);
	}
}