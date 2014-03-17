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

module.exports = RequestRouter;

var url = require('url'),
	util = require('util');

var SLASH_REPLACE_REGEXP = /(^(\/|\\))|((\/|\\)$)/g,
	MODULE_CONTEXT_PARAMETER_REGEXP = /^\w+_.+$/i,
	MODULE_CONTEXT_PREFIX_SEPARATOR = '_',
	TRACE_INCOMING_REQUEST = 'Incoming %s request "%s" from %s:%d',
	TRACE_END_RESPONSE = 'End response for %s request "%s" to %s:%d (%dms)',
	INFO_READY_TO_HANDLE_REQUESTS = 'Ready to handle requests';

/**
 * Creates new instance of request router.
 * @param {PageRenderer} $pageRenderer Page renderer to render responses.
 * @param {Logger} $logger Logger to log status messages.
 * @constructor
 */
function RequestRouter($pageRenderer, $logger) {
	this._pageRenderer = $pageRenderer;
	this._logger = $logger;
	this._logger.info(INFO_READY_TO_HANDLE_REQUESTS);
}

/**
 * Current instance of logger.
 * @type {Logger}
 * @private
 */
RequestRouter.prototype._logger = null;

/**
 * Current page renderer.
 * @type {PageRenderer}
 * @private
 */
RequestRouter.prototype._pageRenderer = null;

/**
 * Routes request to right template and parse query parameters.
 * @param {http.IncomingMessage} request HTTP request from client.
 * @param {http.ServerResponse} response HTTP response to client.
 * @param {Function} next Next function for middleware.
 */
RequestRouter.prototype.route = function (request, response, next) {
	var requestStartTime = (new Date()).getTime(),
		method = request.method,
		url = request.url,
		address = request.socket.remoteAddress,
		port = request.socket.remotePort,
		self = this;

	response.on('finish', function () {
		var requestEndTime = (new Date()).getTime(),
			duration = requestEndTime - requestStartTime;

		self._logger.trace(util.format(TRACE_END_RESPONSE,
			method, url, address, port, duration
		));
	});
	this._logger.trace(util.format(TRACE_INCOMING_REQUEST,
		method, url, address, port
	));
	var parameters = parseParameters(request);
	this._pageRenderer.render(response, parameters.$global.$pageName,
		parameters, next);
};

/**
 * Parses query string parameters grouping by modules and globals.
 * @param {http.ClientRequest} request HTTP request.
 * @returns {Object}
 */
function parseParameters(request) {
	var urlInfo = url.parse(request.url, true),
		globalParameters = {
			$request: request,
			$pageName: urlInfo.pathname.replace(SLASH_REPLACE_REGEXP, '')
		},
		parametersByModules = {$global: globalParameters},
		currentPair,
		currentModuleName,
		currentModuleParameterName;

	for (var parameter in urlInfo.query) {
		if (!urlInfo.query.hasOwnProperty(parameter)) {
			continue;
		}

		if (MODULE_CONTEXT_PARAMETER_REGEXP.test(parameter)) {
			currentPair = parameter.split(MODULE_CONTEXT_PREFIX_SEPARATOR);
			currentModuleName = currentPair[0];
			currentModuleParameterName = currentPair[1];

			if (!parametersByModules.hasOwnProperty(currentModuleName)) {
				parametersByModules[currentModuleName] =
					Object.create(globalParameters);
			}

			parametersByModules[currentModuleName][currentModuleParameterName] =
				urlInfo.query[parameter];
		} else {
			globalParameters[parameter] = urlInfo.query[parameter];
		}
	}

	return parametersByModules;
}