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
	moduleContextHelper = require('../helpers/moduleContextHelper');

var END_EVENT_FORMAT = '!%s',
	TRACE_EVENT_RAISED = 'Raised event with name "%s"';

/**
 * Creates new instance of module event router.
 * @param {Logger} $logger Logger to log messages.
 * @param {ModuleLoader} $moduleLoader Module loader to get set of modules.
 * @constructor
 */
function EventRouter($logger, $moduleLoader) {
	this._logger = $logger;
	this._modulesByNames = $moduleLoader.getModulesByNames();
}

/**
 * Current set of modules.
 * @type {Object}
 * @private
 */
EventRouter.prototype._modulesByNames = null;

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
 * @param {string} eventName Name of event.
 * @param {boolean} isEnded Is event already ended.
 * @param {Function} callback Callback on finish.
 * @private
 */
EventRouter.prototype.routeEvent = function (eventName, isEnded, callback) {
	callback = callback || dummy;
	var self = this,
		moduleAndEvent = moduleContextHelper.splitModuleNameAndContext(eventName),
		currentEventName = moduleAndEvent ?
			moduleAndEvent.context :
			eventName,
		modules = moduleAndEvent &&
			moduleAndEvent.moduleName in this._modulesByNames ?
			[moduleAndEvent.moduleName] :
			Object.keys(this._modulesByNames),
		currentModule;

	if (isEnded) {
		currentEventName = util.format(END_EVENT_FORMAT, currentEventName);
	}

	var thenFunctions = [];

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
		currentModule = self._modulesByNames[modules.shift()].implementation;
		try {
			currentModule.handle(currentEventName, resultHandler);
		} catch (e) {
			self._logger.error(e);
			endCheck();
		}
	};

	var endCheck = function () {
		if (modules.length === 0) {
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
 * Does nothing as default callback.
 */
function dummy() {}