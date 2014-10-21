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

module.exports = RequestRouter;

var util = require('util');

var TRACE_INCOMING_REQUEST = 'Request to %s "%s" from %s:%d',
	TRACE_END_RESPONSE = 'Response from %s "%s" to %s:%d (%d ms)';

/**
 * Creates new instance of request router.
 * @param {ServiceLocator} $serviceLocator Service locator to resolve
 * dependencies.
 * @constructor
 */
function RequestRouter($serviceLocator) {
	this._pageRenderer = $serviceLocator.resolve('pageRenderer');
	this._logger = $serviceLocator.resolve('logger');
	this._stateProvider = $serviceLocator.resolve('stateProvider');
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._serviceLocator = $serviceLocator;
}

/**
 * Current context factory.
 * @type {ContextFactory}
 * @private
 */
RequestRouter.prototype._contextFactory = null;

/**
 * Current logger.
 * @type {Logger}
 * @protected
 */
RequestRouter.prototype._logger = null;

/**
 * Current page renderer.
 * @type {PageRenderer}
 * @private
 */
RequestRouter.prototype._pageRenderer = null;

/**
 * Current state provider.
 * @type {StateProvider}
 * @private
 */
RequestRouter.prototype._stateProvider = null;

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
RequestRouter.prototype._serviceLocator = null;

/**
 * Routes request to root template and parse query parameters.
 * @param {http.IncomingMessage} request HTTP request.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Function?} next Next function for middleware.
 */
RequestRouter.prototype.route = function (request, response, next) {
	if (!(next instanceof Function)) {
		next = function () {};
	}

	var cookiesWrapper = this._serviceLocator.resolve('cookiesWrapper');
	cookiesWrapper.initWithString(request.headers.cookie);

	var renderingParameters = this._contextFactory.create(
		{}, cookiesWrapper,
		this._stateProvider.getStateByUrl(request.url),
		{
			url: request.headers.host ?
				('//' + request.headers.host + request.url) : request.url,
			urlPath: request.url,
			referrer: request.headers ? request.headers.referer : '',
			userAgent: request.headers ? request.headers['user-agent'] : ''
		}
	);
	if (!renderingParameters.state) {
		next();
		return;
	}

	var requestStartTime = Date.now(),
		method = request.method,
		url = request.url,
		address = request.socket.remoteAddress,
		port = request.socket.remotePort,
		self = this;

	this._logger.trace(util.format(TRACE_INCOMING_REQUEST,
		method, url, address, port
	));

	response.on('finish', function () {
		var requestEndTime = Date.now(),
			duration = requestEndTime - requestStartTime;

		self._logger.trace(util.format(TRACE_END_RESPONSE,
			method, url, address, port, duration
		));
	});

	this._pageRenderer.render(response, renderingParameters, next);
};