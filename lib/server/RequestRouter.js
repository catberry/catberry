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

var url = require('url');

var SLASH_REPLACE_REGEXP = /(^(\/|\\))|((\/|\\)$)/g,
	MODULE_CONTEXT_PARAMETER_REGEXP = /^\w+_.+$/i,
	MODULE_CONTEXT_PREFIX_SEPARATOR = '_';

/**
 * Creates new instance of request router.
 * @param {PageRenderer} $pageRenderer Page renderer to render responses.
 * @constructor
 */
function RequestRouter($pageRenderer) {
	this._pageRenderer = $pageRenderer;
}

/**
 * Current page renderer.
 * @type {PageRenderer}
 * @private
 */
RequestRouter.prototype._pageRenderer = null;

/**
 * Routes request to right template and parse query parameters.
 * @param {http.ClientRequest} request HTTP request from client.
 * @param {http.ServerResponse} response HTTP response to client.
 * @param {Function} next Next function for middleware.
 */
RequestRouter.prototype.route = function (request, response, next) {
	var urlInfo = url.parse(request.url, true),
		parameters = request.query || convertParameters(urlInfo.query),
		templateName = urlInfo.pathname.replace(SLASH_REPLACE_REGEXP, '');
	this._pageRenderer.render(response, templateName, parameters, next);
};

/**
 * Converts query string parameters grouping it by modules and globals.
 * @param {Object} queryParameters Parsed query string.
 * @returns {Object}
 */
function convertParameters(queryParameters) {
	var globalParameters = {},
		parametersByModules = {},
		currentPair,
		currentModuleName,
		currentModuleParameterName;

	for (var parameter in queryParameters) {
		if (!queryParameters.hasOwnProperty(parameter)) {
			continue;
		}

		if (MODULE_CONTEXT_PARAMETER_REGEXP.test(parameter)) {
			currentPair = parameter.split(MODULE_CONTEXT_PREFIX_SEPARATOR);
			currentModuleName = currentPair[0];
			currentModuleParameterName = currentPair[1];

			if (!(currentModuleName in parametersByModules)) {
				parametersByModules[currentModuleName] =
					Object.create(globalParameters);
			}

			parametersByModules[currentModuleName][currentModuleParameterName] =
				queryParameters[parameter];
		} else {
			globalParameters[parameter] = queryParameters[parameter];
		}
	}

	return parametersByModules;
}