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
	propertyHelper = require('../lib/helpers/propertyHelper'),
	ModuleApiProviderBase = require('../lib/base/ModuleApiProviderBase'),
	moduleHelper = require('../lib/helpers/moduleHelper');

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

	propertyHelper.defineReadOnly(this, 'isBrowser', true);
	propertyHelper.defineReadOnly(this, 'isServer', false);
}

/**
 * Redirects current page to specified URL.
 * @param {string} locationUrl URL to direct.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.redirect = function (locationUrl) {
	var requestRouter = this._serviceLocator.resolve('requestRouter');
	return requestRouter.go(locationUrl);
};

/**
 * Clears current location's hash.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.clearHash = function () {
	var requestRouter = this._serviceLocator.resolve('requestRouter');
	requestRouter.clearHash();
	return Promise.resolve();
};

/**
 * Requests refresh of module's placeholder.
 * Refresh also re-handles current hash event.
 * @param {string} moduleName Name of module to render.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.requestRefresh =
	function (moduleName, placeholderName) {
		var self = this;
		return this.requestRender(moduleName, placeholderName)
			.then(function () {
				var currentHash = self._window.location.hash;
				if (!currentHash) {
					return;
				}
				var moduleNameAndContext = moduleHelper
					.splitModuleNameAndContext(currentHash.substring(1));
				if (moduleNameAndContext === null ||
					moduleNameAndContext.moduleName === moduleName) {
					return self.clearHash()
						.then(self.redirect.bind(self, currentHash));
				}
			});
	};

/**
 * Requests render of module's placeholder.
 * @param {string} moduleName Name of module to render.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @returns {Promise} Promise for nothing.
 */
ModuleApiProvider.prototype.requestRender =
	function (moduleName, placeholderName) {
		var requestRouter = this._serviceLocator.resolve('requestRouter');
		return requestRouter.requestRender(moduleName, placeholderName);
	};

/**
 * Renders specified template with data.
 * @param {string} moduleName Name of module, template owner.
 * @param {string} templateName Name of template.
 * @param {Object} data Data context for template.
 * @returns {Promise<string>} Promise for rendered template.
 */
ModuleApiProvider.prototype.render = function (moduleName, templateName, data) {
	var templateProvider = this._serviceLocator.resolve('templateProvider');
	return templateProvider.render(
		moduleHelper.joinModuleNameAndContext(moduleName, templateName),
		data
	);
};