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

'use strict';

module.exports = DocumentRenderer;

var util = require('util'),
	ComponentTransform = require('./streams/ComponentTransform');

var RESPONSE_HEADERS = {
		'Content-Type': 'text/html; charset=utf-8',
		'X-Powered-By': 'Catberry'
	};

/**
 * Creates new instance of page renderer.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 * @extends PageRendererBase
 */
function DocumentRenderer($serviceLocator) {
	var self = this;
	this._serviceLocator = $serviceLocator;
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._componentLoader = $serviceLocator.resolve('componentLoader');
	this._eventBus = $serviceLocator.resolve('eventBus');

	this._componentsLoading = this._componentLoader
		.load()
		.then(function () {
			self._eventBus.emit('ready');
			self._componentsLoading = null;
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
}

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
DocumentRenderer.prototype._serviceLocator = null;

/**
 * Current component loader.
 * @type {ComponentLoader}
 * @private
 */
DocumentRenderer.prototype._componentLoader = null;

/**
 * Current module loading promise.
 * @type {Promise}
 * @private
 */
DocumentRenderer.prototype._componentsLoading = null;

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
DocumentRenderer.prototype._contextFactory = null;

/**
 * Renders response on request with specified parameters and page name.
 * @param {Object} routingContext Routing Context.
 * @param {Object} state State of the application.
 * @param {http.ServerResponse} response HTTP response.
 */
DocumentRenderer.prototype.render = function (routingContext, state, response) {
	var self = this;
	// TODO add support fo inline script in document component
	this._getPromiseForReadyState()
		.then(function () {
			var renderingContext = {
				isDocumentRendered: false,
				isHeadRendered: false,
				locator: self._serviceLocator,
				renderedIds: {},
				routingContext: routingContext,
				storeDispatcher: self._serviceLocator
					.resolve('storeDispatcher'),
				eventBus: self._eventBus,
				components: self._componentLoader.getComponentsByNames()
			};
			renderingContext.storeDispatcher.setState(state, routingContext);

			response.writeHead(200, RESPONSE_HEADERS);

			var renderStream = new ComponentTransform(renderingContext);
			renderStream
				.pipe(response)
				.on('end', function () {
					self._eventBus.emit('pageRendered', renderingContext);
				});
		});
};

/**
 * Promises something when renderer is ready to handle requests.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._getPromiseForReadyState = function () {
	return this._componentsLoading ?
		this._componentsLoading :
		Promise.resolve();
};