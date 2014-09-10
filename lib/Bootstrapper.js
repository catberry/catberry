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

var util = require('util'),
	path = require('path'),
	dust = require('dustjs-linkedin'),
	BrowserBundleBuilder = require('./BrowserBundleBuilder'),
	ModuleFinder = require('./ModuleFinder'),
	BootstrapperBase = require('./base/BootstrapperBase'),
	Catberry = require('./Catberry'),
	routeDefinitions,
	eventDefinitions,
	Log4js = require('log4js');

// try to load list of URL mappers
try {
	routeDefinitions = require(path.join(process.cwd(), 'routes'));
} catch (e) {
	// nothing to do here
}
routeDefinitions = routeDefinitions || [];

// try to load list of event mappers
try {
	eventDefinitions = require(path.join(process.cwd(), 'events'));
} catch (e) {
	// nothing to do here
}
eventDefinitions = eventDefinitions || [];

var INFO_MODULE_FOUND = 'Module "%s" was found at "%s"',
	INFO_PLACEHOLDER_FOUND = 'Placeholder "%s" of module "%s" was found at "%s"',
	INFO_BUNDLE_BUILT = 'Browser bundle was successfully built at %s (%d ms)';

util.inherits(Bootstrapper, BootstrapperBase);

/**
 * Creates new instance of server catberry bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
function Bootstrapper() {
	BootstrapperBase.call(this, Catberry);
}

/**
 * Configures catberry locator.
 * @param {Object} configObject Config object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
Bootstrapper.prototype.configure = function (configObject, locator) {
	BootstrapperBase.prototype.configure.call(this, configObject, locator);
	// if V8 still does not have promises then add it.
	if (!('Promise' in global)) {
		global.Promise = locator.resolve('promise');
	}

	locator.register(
		'browserBundleBuilder', BrowserBundleBuilder, configObject, true
	);
	locator.register('moduleFinder', ModuleFinder, configObject, true);
	locator.registerInstance('dust', dust);

	var logger = Log4js.getLogger('catberry');
	locator.registerInstance('logger', logger);
	process.on('uncaughtException', function (error) {
		logger.fatal(error);
	});

	var eventBus = locator.resolve('eventBus');
	this._wrapEventsWithLogger(eventBus, logger);

	routeDefinitions.forEach(function (routeDefinition) {
		locator.registerInstance('routeDefinition', routeDefinition);
	});
	eventDefinitions.forEach(function (eventDefinition) {
		locator.registerInstance('eventDefinition', eventDefinition);
	});
};

/**
 * Wraps event bus with log messages.
 * @param {EventEmitter} eventBus Event emitter that implements event bus.
 * @param {Logger} logger Logger to write messages.
 * @protected
 */
Bootstrapper.prototype._wrapEventsWithLogger = function (eventBus, logger) {
	BootstrapperBase.prototype._wrapEventsWithLogger
		.call(this, eventBus, logger);

	eventBus
		.on('moduleFound', function (args) {
			logger.info(util.format(INFO_MODULE_FOUND,
				args.name, args.path
			));
		})
		.on('placeholderFound', function (args) {
			logger.info(util.format(INFO_PLACEHOLDER_FOUND,
				args.name, args.moduleName, args.path
			));
		})
		.on('bundleBuilt', function (args) {
			logger.info(util.format(INFO_BUNDLE_BUILT, args.path, args.time));
		});
};

module.exports = new Bootstrapper();