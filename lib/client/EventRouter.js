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

module.exports = EventRouter;

var util = require('util'),
	routeHelper = require('../helpers/routeHelper');

var TRACE_EVENT_RAISED = 'Raised event with name "%s"',
	INFO_EVENT_REGISTERED =
		'Event with name "%s" is registered for modules "[%s]"';

/**
 * Creates new instance of module event router.
 * @param {Logger} $logger Logger to log messages.
 * @param {ModuleLoader} $moduleLoader Module loader to get set of modules.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve mappers.
 * @constructor
 */
function EventRouter($logger, $moduleLoader, $serviceLocator) {
	this._logger = $logger;
	this._moduleLoader = $moduleLoader;
	this._eventMappers = $serviceLocator
		.resolveAll('eventDefinition')
		.map(routeHelper.getEventMapperByRule)
		.filter(function (mapper) {
			if (mapper) {
				$logger.info(util.format(
					INFO_EVENT_REGISTERED,
					mapper.eventName,
					mapper.moduleNames.join(',')
				));
				return true;
			}
			return false;
		});
}

/**
 * Current module loader.
 * @type {ModuleLoader}
 * @private
 */
EventRouter.prototype._moduleLoader = null;

/**
 * Last happened event.
 * @type {string}
 * @private
 */
EventRouter.prototype._lastEvent = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
EventRouter.prototype._logger = null;

/**
 * Current list of event mappers.
 * @type {Array}
 * @private
 */
EventRouter.prototype._eventMappers = null;

/**
 * Routes hash change event.
 * @param {string} eventName Name of event (hash).
 */
EventRouter.prototype.routeHashChange = function (eventName) {
	var self = this;

	var sendHandler = function () {
		self._lastEvent = eventName;
		self.routeEvent(eventName, false, function (error) {
			if (error) {
				self._logger.error(error);
				return;
			}
			self._logger.trace(
				util.format(TRACE_EVENT_RAISED, eventName));

		});
	};

	if (this._lastEvent) {
		this.routeEvent(this._lastEvent, true,
			function (error) {
				if (error) {
					self._logger.error(error);
					return;
				}
				if (!eventName) {
					return;
				}
				sendHandler();
			}
		);
	} else if (eventName) {
		sendHandler();
	}
};

/**
 * Sends event to all required receivers.
 * @param {string} event Event string.
 * @param {boolean?} isEnded Is event already ended.
 * @param {Function?} callback Callback on finish.
 */
EventRouter.prototype.routeEvent = function (event, isEnded, callback) {
	callback = callback || dummy;
	var eventMapper = this._getMapper(event);
	if (!eventMapper || eventMapper.moduleNames.length === 0) {
		callback();
		return;
	}

	var self = this,
		modulesByNames = this._moduleLoader.getModulesByNames(),
		args = eventMapper.map(event),
		queue = eventMapper.moduleNames.slice(),
		thenFunctions = [];

	var resultHandler = function (error, then) {
		if (typeof(then) === 'function') {
			thenFunctions.push(then);
		}
		if (error) {
			self._logger.error(error);
		}
		endCheck();
	};

	var iteration = function () {
		var currentModuleName = queue.shift(),
			currentModule = modulesByNames[currentModuleName].implementation;
		try {
			currentModule.handle(eventMapper.eventName, !isEnded,
				args, resultHandler);
		} catch (e) {
			self._logger.error(e);
			endCheck();
		}
	};

	var endCheck = function () {
		if (queue.length === 0) {
			callback();
			thenFunctions.forEach(function (then) {
				then();
			});
		} else {
			iteration();
		}
	};

	endCheck();
};

/**
 * Gets event mapper for event.
 * @param {string} event Event string.
 * @returns {{
 * eventName:string,
 * moduleNames: Array,
 * expression: RegExp,
 * map: Function}} URL mapper object.
 * @private
 */
EventRouter.prototype._getMapper = function (event) {
	var eventMapper = null;

	this._eventMappers.some(function (currentEventMapper) {
		if (currentEventMapper.expression.test(event)) {
			eventMapper = currentEventMapper;
			return true;
		}
		return false;
	});

	return eventMapper;
};

/**
 * Does nothing as default callback.
 */
function dummy() {}