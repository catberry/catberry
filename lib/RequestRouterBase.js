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

module.exports = RequestRouterBase;

var url = require('url');

var SLASH_REPLACE_REGEXP = /(^(\/|\\))|((\/|\\)$)/g,
	MODULE_CONTEXT_PARAMETER_REGEXP = /^\w+_.+$/i,
	MODULE_CONTEXT_PREFIX_SEPARATOR = '_';

/**
 * Creates new instance of base request router.
 * @param {PageRenderer} $pageRenderer Page renderer to render response.
 * @param {Logger} $logger Logger to log status messages.
 * @constructor
 */
function RequestRouterBase($pageRenderer, $logger) {
	this._pageRenderer = $pageRenderer;
	this._logger = $logger;
}

/**
 * Current logger.
 * @type {Logger}
 * @protected
 */
RequestRouterBase.prototype._logger = null;

/**
 * Current page renderer.
 * @type {PageRenderer}
 * @private
 */
RequestRouterBase.prototype._pageRenderer = null;

/**
 * Parses query string parameters grouping by modules and globals.
 * @param {string} urlText HTTP request URL.
 * @returns {Object} Set of grouped parameters.
 */
RequestRouterBase.prototype._parseParameters = function (urlText) {
	var urlInfo = url.parse(urlText, true),
		globalParameters = {
			$pageName: urlInfo.pathname.replace(SLASH_REPLACE_REGEXP, ''),
			$path: urlInfo.pathname + urlInfo.search,
			$queryString: urlInfo.search,
			$hash: urlInfo.hash
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
};

/**
 * Routes incoming query.
 */
RequestRouterBase.prototype.route = function () {

};