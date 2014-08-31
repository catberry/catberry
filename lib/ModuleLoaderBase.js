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

module.exports = ModuleLoaderBase;

var moduleHelper = require('./helpers/moduleHelper');

/**
 * Creates new instance of basic module loader.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 */
function ModuleLoaderBase($serviceLocator) {
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._config = $serviceLocator.resolve('config');
	this._templateProvider = $serviceLocator.resolve('templateProvider');
	this._serviceLocator = $serviceLocator;
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @protected
 */
ModuleLoaderBase.prototype._serviceLocator = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @protected
 */
ModuleLoaderBase.prototype._eventBus = null;

/**
 * Current application config.
 * @type {Object}
 * @protected
 */
ModuleLoaderBase.prototype._config = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @protected
 */
ModuleLoaderBase.prototype._templateProvider = null;

/**
 * Current set of loaded modules.
 * @type {Object}
 * @protected
 */
ModuleLoaderBase.prototype._loadedModules = null;

/**
 * Current set of placeholders by ids.
 * @type {Object}
 * @private
 */
ModuleLoaderBase.prototype._placeholdersByIds = null;

/**
 * Gets map of placeholders by IDs.
 * @returns {Object|null}
 */
ModuleLoaderBase.prototype.getPlaceholdersByIds = function () {
	if (!this._loadedModules) {
		return {};
	}

	if (this._placeholdersByIds) {
		return this._placeholdersByIds;
	}

	this._placeholdersByIds = {};

	Object.keys(this._loadedModules)
		.forEach(function (moduleName) {
			Object.keys(this._loadedModules[moduleName].placeholders)
				.forEach(function (placeholderName) {
					var id = moduleHelper.joinModuleNameAndContext(
						moduleName, placeholderName
					);
					this._placeholdersByIds[id] =
						this._loadedModules[moduleName]
							.placeholders[placeholderName];
				}, this);
		}, this);

	return this._placeholdersByIds;
};