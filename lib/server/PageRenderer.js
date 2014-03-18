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

module.exports = PageRenderer;

var fs = require('fs'),
	util = require('util'),
	PageRendererBase = require('../PageRendererBase'),
	PlaceholderTransform = require('./streams/PlaceholderTransform'),
	ModuleReadable = require('./streams/ModuleReadable');

var MODULE_CONTEXT_PREFIX_SEPARATOR = '_',
	TRACE_RENDERING_PAGE = 'Rendering page of module "%s"',
	RESPONSE_HEADERS = {
		'Content-Type': 'text/html; charset=utf-8',
		Server: 'Catberry'
	};

util.inherits(PageRenderer, PageRendererBase);
/**
 * Creates new instance of page renderer.
 * @param {ModuleLoader} $moduleLoader Module loader to get modules.
 * @param {ResourceBuilder} $resourceBuilder Resource builder for assets.
 * @param {Logger} $logger Logger to log errors and trace.
 * @param {ClientBundleBuilder} $clientBundleBuilder Client bundle builder.
 * @constructor
 * @extends PageRendererBase
 */
function PageRenderer($moduleLoader, $resourceBuilder, $logger,
	$clientBundleBuilder) {
	PageRendererBase.call(this, $moduleLoader);
	this._logger = $logger;
	$resourceBuilder.buildResources(this._modulesByNames);
	$clientBundleBuilder.build();
	initializePlaceholders(this);
}

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
PageRenderer.prototype._logger = null;

/**
 * Renders response on client request with specified parameters and page name.
 * @param {http.ServerResponse} response HTTP response.
 * @param {string} pageName Name of page in URL.
 * @param {Object} parameters Set of request parameters.
 * @param {Function} next Next function for middleware.
 */
PageRenderer.prototype.render =
	function (response, pageName, parameters, next) {
		if (!(this._modulesByNames.hasOwnProperty(pageName)) ||
			!this._modulesByNames[pageName].rootPlaceholder) {
			next();
			return;
		}

		var self = this,
			module = this._modulesByNames[pageName],
			rootPlaceholder = module.rootPlaceholder,
			context, transformStream, renderStream;

		this._logger.trace(util.format(TRACE_RENDERING_PAGE, pageName));
		try {
			context = {
				parameters: parameters,
				modulesByNames: this._modulesByNames,
				placeholderIds: this._placeholderIds,
				placeholdersByIds: this._placeholdersByIds
			};
			transformStream = new PlaceholderTransform(context);
			renderStream =
				new ModuleReadable(module, rootPlaceholder, parameters);

			renderStream.on('error', function (error) {
				self._logger.error(error);
				next(error);
			});

			transformStream.on('error', function (error) {
				self._logger.error(error);
				next(error);
			});

			renderStream.render();
		} catch (e) {
			next(e);
			return;
		}

		response.writeHead(200, RESPONSE_HEADERS);

		renderStream
			.pipe(transformStream)
			.pipe(response);
	};

/**
 * Initializes all placeholders data structures for fast access.
 * @param {PageRenderer} context Context of execution.
 */
function initializePlaceholders(context) {
	context._placeholdersByIds = {};
	context._placeholderIds = [];

	var currentPlaceholders;

	for (var moduleName in context._modulesByNames) {
		if (!context._modulesByNames.hasOwnProperty(moduleName)) {
			continue;
		}

		currentPlaceholders = context._modulesByNames[moduleName].placeholders;
		for (var placeholderName in currentPlaceholders) {
			if (!currentPlaceholders.hasOwnProperty(placeholderName)) {
				continue;
			}

			var id = moduleName +
				MODULE_CONTEXT_PREFIX_SEPARATOR + placeholderName;

			context._placeholderIds.push(id);
			context._placeholdersByIds[id] =
				currentPlaceholders[placeholderName];
		}
	}
}
