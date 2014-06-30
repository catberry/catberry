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

module.exports = ModuleApiProvider;

var util = require('util'),
	ModuleApiProviderBase = require('../ModuleApiProviderBase'),
	moduleContextHelper = require('../helpers/moduleContextHelper');

util.inherits(ModuleApiProvider, ModuleApiProviderBase);

/**
 * Creates new instance of module API provider.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve a lot of services.
 * @constructor
 * @extends ModuleApiProviderBase
 */
function ModuleApiProvider($serviceLocator) {
	ModuleApiProviderBase.call(this, $serviceLocator);
	this._window = $serviceLocator.resolve('window');

	Object.defineProperty(this, 'isBrowser', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: true
	});
	Object.defineProperty(this, 'isServer', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: false
	});
}

/**
 * Redirects current page to specified URL.
 * @param {string} locationUrl URL to direct.
 */
ModuleApiProvider.prototype.redirect = function (locationUrl) {
	var requestRouter = this._serviceLocator.resolve('requestRouter');
	requestRouter.go(locationUrl);
};

/**
 * Clears current locations hash.
 */
ModuleApiProvider.prototype.clearHash = function () {
	var requestRouter = this._serviceLocator.resolve('requestRouter');
	requestRouter.clearHash();
};

/**
 * Requests refresh of module's placeholder.
 * @param {string} moduleName Name of module to render.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @param {Function?} callback Callback on finish.
 */
ModuleApiProvider.prototype.requestRefresh =
	function (moduleName, placeholderName, callback) {
		callback = callback instanceof Function ? callback : dummy;
		var self = this;
		this.requestRender(moduleName, placeholderName, function (error) {
			var currentHash = self._window.location.hash;
			if (currentHash) {
				var moduleNameAndContext = moduleContextHelper
					.splitModuleNameAndContext(currentHash.substring(1));
				if (moduleNameAndContext === null ||
					moduleNameAndContext.moduleName ===
					moduleName) {
					self.clearHash();
					self.redirect(currentHash);
				}
			}
			callback(error);
		});
	};

/**
 * Requests render of module's placeholder.
 * @param {string} moduleName Name of module to render.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @param {Function?} callback Callback on finish.
 */
ModuleApiProvider.prototype.requestRender =
	function (moduleName, placeholderName, callback) {
		var requestRouter = this._serviceLocator.resolve('requestRouter');
		requestRouter.requestRender(moduleName, placeholderName, callback);
	};

/**
 * Does nothing and is used as default callback.
 */
function dummy() {}