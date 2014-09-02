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
	moduleHelper = require('../helpers/moduleHelper'),
	routeHelper = require('../helpers/routeHelper');

/**
 * Creates new instance of module event router.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @constructor
 */
function EventRouter($serviceLocator) {
	this._moduleLoader = $serviceLocator.resolve('moduleLoader');
	this._eventBus = $serviceLocator.resolve('eventBus');
	this._eventMappers = $serviceLocator
		.resolveAll('eventDefinition')
		.map(routeHelper.getEventMapperByRule)
		.filter(function (mapper) {
			if (mapper) {
				this._eventBus.emit('eventRegistered', {
					eventName: mapper.eventName,
					moduleNames: mapper.moduleNames,
					expression: mapper.expression
				});
				return true;
			}
			return false;
		}, this);
}

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
EventRouter.prototype._eventBus = null;

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
 * Current list of event mappers.
 * @type {Array}
 * @private
 */
EventRouter.prototype._eventMappers = null;

/**
 * Routes hash change event.
 * @param {string} eventString Event hash string.
 * @returns {Promise} Promise for nothing.
 */
EventRouter.prototype.routeHashChange = function (eventString) {
	var self = this,
		promise = this._lastEvent ?
			// previous hash is changed and we need to end previous event.
			this.routeEvent({
				string: this._lastEvent,
				isEnding: true,
				isHashChanging: true,
				element: null
			}) :
			Promise.resolve();

	return promise.then(function () {
		// if error or we just clear the hash
		if (!eventString) {
			return;
		}
		self._lastEvent = eventString;
		return self.routeEvent({
			string: self._lastEvent,
			isEnding: false,
			isHashChanging: true,
			element: null
		});
	});
};

/**
 * Routes events connected with data-event attribute in elements.
 * @param {string} eventString Event string (data-event attribute value).
 * @param {jQuery} element Element that has such data-event attribute.
 * @returns {Promise} Promise for nothing.
 */
EventRouter.prototype.routeDataEvent = function (eventString, element) {
	return this.routeEvent({
		string: eventString,
		isEnding: false,
		isHashChanging: false,
		element: element
	});
};

/**
 * Sends event to all required receivers.
 * @param {Object} event Event descriptor.
 * @returns {Promise} Promise for nothing.
 */
EventRouter.prototype.routeEvent = function (event) {
	event = Object.create(event);
	event.string = decodeURIComponent(event.string);

	var self = this,
		eventMapper = this._getMapper(event.string);
	if (!eventMapper || eventMapper.moduleNames.length === 0) {
		return Promise.resolve();
	}

	event.name = eventMapper.eventName;
	event.args = eventMapper.map(event.string);

	var modulesByNames = self._moduleLoader.getModulesByNames(),
		afterMethods = [];

	var promises = eventMapper.moduleNames.map(function (moduleName) {
		if (!(moduleName in modulesByNames)) {
			return Promise.resolve();
		}
		var currentModule = modulesByNames[moduleName].implementation,
			handleMethod = moduleHelper.getMethodToInvoke(
				currentModule, 'handle', event.name
			),
			afterMethod = moduleHelper.getMethodToInvoke(
				currentModule, 'afterHandle', event.name
			),
			handlePromise;
		try {
			handlePromise = Promise.resolve(handleMethod(event));
		} catch (e) {
			handlePromise = Promise.reject(e);
		}

		afterMethods.push(afterMethod);
		return handlePromise;
	});

	return Promise.all(promises)
		.then(function () {
			var afterMethodPromises = afterMethods.map(
				function (afterMethod) {
					var afterPromise;
					try {
						afterPromise = Promise.resolve(afterMethod(event));
					} catch (e) {
						afterPromise = Promise.reject(e);
					}
					return afterPromise;
				});

			return Promise.all(afterMethodPromises);
		})
		.then(function () {
			self._eventBus.emit('eventRouted', event);
		});
};

/**
 * Gets event mapper for event.
 * @param {string} event Event string.
 * @returns {{
 * eventName:string,
 * moduleNames: Array,
 * expression: RegExp,
 * map: Function}} Event mapper object.
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