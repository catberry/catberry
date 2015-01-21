/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = StoreDispatcher;

var moduleHelper = require('../../lib/helpers/moduleHelper');

function StoreDispatcher(stores) {
	this._stores = stores;
}

StoreDispatcher.prototype.getStoreData = function (storeName, basicContext) {
	return this._stores[storeName].load();
};

StoreDispatcher.prototype.sendAction =
	function (basicContext, storeName, actionName, arg) {
		if (this._stores[storeName]) {
			var method = moduleHelper.getMethodToInvoke(
				this._stores, 'handle', actionName
			);
			var promise;
			try {
				promise = Promise.resolve(method(arg));
			}catch(e) {
				promise.reject(e);
			}

			return promise;
		}
	};

StoreDispatcher.prototype.sendBroadcastAction =
	function (basicContext, actionName, arg) {
		var self = this,
			promises = Object
			.keys(this._stores)
			.map(function (storeName) {
				return self.sendAction(
					basicContext, storeName, actionName, arg
				);
			});
		return Promise.all(promises);
	};

StoreDispatcher.prototype.setState = function () {
};
