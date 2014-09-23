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

/**
 * This module is a template and it is used only with some string replaces
 * by BrowserBundleBuilder module. It does not work by itself.
 */

'use strict';

var modules = [
/**__modules**/
];

var placeholders = [
/**__placeholders**/
];

var util = require('util'),
	routeDefinitions = '__routeDefinitions' || [],
	eventDefinitions = '__eventDefinitions' || [],
	Catberry = require('./node_modules/catberry/browser/Catberry.js'),
	Logger = require('./node_modules/catberry/browser/Logger.js'),
	EventRouter = require('./node_modules/catberry/browser/EventRouter.js'),
	FormSubmitter = require('./node_modules/catberry/browser/FormSubmitter.js'),
	BootstrapperBase =
		require('./node_modules/catberry/lib/base/BootstrapperBase.js');

var INFO_EVENT_REGISTERED =
		'Event "%s" was registered for module(s) %s',
	TRACE_EVENT_START_ROUTED =
		'Starting event "%s" in module(s) %s',
	TRACE_EVENT_END_ROUTED =
		'Ending event "%s" in module(s) "%s"',
	TRACE_RENDER_REQUEST =
		'Requesting rendering of placeholder "%s", module "%s"',
	TRACE_FORM_SUBMITTED =
		'Form "%s" was submitted to module "%s"';

util.inherits(Bootstrapper, BootstrapperBase);

/**
 * Creates new instance of browser catberry bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
function Bootstrapper() {
	BootstrapperBase.call(this, Catberry);
}

/**
 * Configures catberry service locator.
 * @param {Object} configObject Application config object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
Bootstrapper.prototype.configure = function (configObject, locator) {
	BootstrapperBase.prototype.configure.call(this, configObject, locator);

	// if browser still does not have promises then add it.
	if (!('Promise' in window)) {
		window.Promise = locator.resolve('promise');
	}

	locator.registerInstance('window', window);
	locator.register('eventRouter', EventRouter, configObject, true);
	locator.register('formSubmitter', FormSubmitter, configObject, true);

	var loggerConfig = configObject.logger || {},
		logger = new Logger(loggerConfig.levels);
	locator.registerInstance('logger', logger);
	window.onerror = function errorHandler(msg, url, line) {
		logger.fatal(url + ':' + line + ' ' + msg);
		return true;
	};
	var eventBus = locator.resolve('eventBus');
	this._wrapEventsWithLogger(eventBus, logger);

	routeDefinitions.forEach(function (routeDefinition) {
		locator.registerInstance('routeDefinition', routeDefinition);
	});
	eventDefinitions.forEach(function (eventDefinition) {
		locator.registerInstance('eventDefinition', eventDefinition);
	});

	modules.forEach(function (module) {
		locator.registerInstance('module', module);
	});

	placeholders.forEach(function (placeholder) {
		locator.registerInstance('placeholder', placeholder);
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
		.on('eventRegistered', function (args) {
			logger.info(util.format(
				INFO_EVENT_REGISTERED,
				args.eventName,
				args.moduleNames.join(', ')
			));
		})
		.on('eventRouted', function (event) {
			var messageFormat = event.isEnding ?
				TRACE_EVENT_END_ROUTED :
				TRACE_EVENT_START_ROUTED;

			logger.trace(util.format(
				messageFormat,
				event.name, event.moduleNames.join(', ')
			));
		})
		.on('renderRequested', function (args) {
			logger.trace(util.format(
				TRACE_RENDER_REQUEST,
				args.placeholderName, args.moduleName
			));
		})
		.on('formSubmitted', function (args) {
			logger.trace(util.format(
				TRACE_FORM_SUBMITTED,
				args.name, args.moduleName
			));
		});
};

module.exports = new Bootstrapper();