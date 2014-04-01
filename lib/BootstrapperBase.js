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

module.exports = BootstrapperBase;

var path = require('path'),
	util = require('util'),
	UrlMappingProvider = require('./UrlMappingProvider'),
	EventEmitter = require('events').EventEmitter,
	configPath = path.join(process.cwd(), 'config.json'),
	config,
	ServiceLocator = require('./ServiceLocator');

var WARN_CONFIG_FILE_NOT_FOUND_FORMAT = 'Config file "%s" not found',
	WARN_USE_CONFIG_OBJECT_INSTEAD_FILE =
		'Config object specified in constructor and overrides file config';

try {
	config = require(configPath);
} catch (e) {
	config = null;
}

/**
 * Creates new instance of base catberry bootstrapper.
 * @param {Function} catberryConstructor Constructor of catberry main module.
 * @constructor
 */
function BootstrapperBase(catberryConstructor) {
	this._catberryConstructor = catberryConstructor;
}

/**
 * Current constructor of catberry main module.
 * @type {Function}
 * @private
 */
BootstrapperBase.prototype._catberryConstructor = null;

/**
 * Creates new full-configured instance of catberry application.
 * @param {Object?} configObject Configuration object.
 * @returns {Catberry} Catberry application instance.
 */
BootstrapperBase.prototype.create = function (configObject) {
	var currentConfig = configObject || config || {},
		catberry = new this._catberryConstructor();

	this.configure(currentConfig, catberry.locator);

	var logger = catberry.locator.resolve('logger');

	if (currentConfig === configObject) {
		logger.warn(WARN_USE_CONFIG_OBJECT_INSTEAD_FILE);
	} else if (configPath && !config) {
		logger.warn(util.format(WARN_CONFIG_FILE_NOT_FOUND_FORMAT, configPath));
	}

	return catberry;
};

/**
 * Configures locator with all required type registrations.
 * @param {Object} configObject Configuration object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
BootstrapperBase.prototype.configure = function (configObject, locator) {
	var eventBus = new EventEmitter();
	eventBus.setMaxListeners(0);
	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('config', configObject);
	locator.register('urlMappingProvider', UrlMappingProvider, {}, true);
};