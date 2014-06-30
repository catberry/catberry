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
	StateProvider = require('./StateProvider'),
	CookiesWrapper = require('./CookiesWrapper'),
	EventEmitter = require('events').EventEmitter,
	ServiceLocator = require('catberry-locator');

var INFO_PLACEHOLDER_LOADED = 'Placeholder "%s" of module "%s" loaded',
	INFO_MODULE_LOADED = 'Module "%s" loaded',
	INFO_ALL_MODULES_LOADED = 'All modules loaded',
	INFO_TEMPLATE_REGISTERED = 'Template "%s" registered',
	TRACE_RENDER_PLACEHOLDER = 'Render placeholder "%s" of module "%s"',
	TRACE_PLACEHOLDER_RENDERED = 'Placeholder "%s" of module "%s" is rendered';

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
	var currentConfig = configObject || {},
		catberry = new this._catberryConstructor();

	this.configure(currentConfig, catberry.locator);
	catberry.API = catberry.locator.resolve('moduleApiProvider');
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
	locator.register('cookiesWrapper', CookiesWrapper, configObject);
	locator.register('stateProvider', StateProvider, {}, true);
};

/**
 * Wraps event bus with log messages.
 * @param {EventEmitter} eventBus Event emitter that implements event bus.
 * @param {Logger} logger Logger to write messages.
 * @protected
 */
BootstrapperBase.prototype._wrapEventsWithLogger = function (eventBus, logger) {
	eventBus.on('placeholderLoaded', function (args) {
		logger.info(util.format(INFO_PLACEHOLDER_LOADED,
			args.name,
			args.moduleName
		));
	});

	eventBus.on('moduleLoaded', function (moduleName) {
		logger.info(util.format(INFO_MODULE_LOADED, moduleName));
	});

	eventBus.on('allModulesLoaded', function () {
		logger.info(INFO_ALL_MODULES_LOADED);
	});

	eventBus.on('placeholderRender', function (args) {
		logger.trace(util.format(TRACE_RENDER_PLACEHOLDER,
			args.name, args.moduleName));
	});

	eventBus.on('placeholderRendered', function (args) {
		logger.trace(util.format(TRACE_PLACEHOLDER_RENDERED,
			args.name, args.moduleName));
	});

	eventBus.on('templateRegistered', function (args) {
		logger.info(util.format(INFO_TEMPLATE_REGISTERED, args.name));
	});

	eventBus.on('error', function (error) {
		logger.error(error);
	});
};