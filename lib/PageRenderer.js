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

var util = require('util'),
	PageRendererBase = require('./base/PageRendererBase'),
	PlaceholderTransform = require('./streams/PlaceholderTransform'),
	ModuleReadable = require('./streams/ModuleReadable');

var MAIN_MODULE_NAME = 'main',
	RESPONSE_HEADERS = {
		'Content-Type': 'text/html; charset=utf-8',
		'X-Powered-By': 'Catberry'
	};

util.inherits(PageRenderer, PageRendererBase);

/**
 * Creates new instance of page renderer.
 * @param {ModuleLoader} $moduleLoader Module loader to get modules.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @param {boolean} isRelease Is application mode release.
 * @constructor
 * @extends PageRendererBase
 */
function PageRenderer($moduleLoader, $eventBus, isRelease) {
	PageRendererBase.call(this, $moduleLoader, $eventBus, isRelease);
	var self = this;
	this._modulesLoading = $moduleLoader
		.loadModules()
		.then(function () {
			self._eventBus.emit('ready');
			PageRenderer.prototype._modulesLoading = null;
		})
		.then(null, function (reason) {
			$eventBus.emit('error', reason);
		});
}

/**
 * Current module loading promise.
 * @type {Promise}
 * @private
 */
PageRenderer.prototype._modulesLoading = null;

/**
 * Renders response on request with specified parameters and page name.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Object} parameters Rendering context.
 * @param {Function} next Next function for middleware.
 */
PageRenderer.prototype.render = function (response, parameters, next) {
	var self = this;

	this._getPromiseForReadyState()
		.then(function () {
			var modulesByNames = self._moduleLoader.getModulesByNames(),
				placeholdersByIds = self._moduleLoader.getPlaceholdersByIds(),
				mainModule = modulesByNames[MAIN_MODULE_NAME];

			if (!mainModule || !mainModule.rootPlaceholder) {
				next();
				return;
			}

			var renderingParameters = {
					isRelease: self._isRelease,
					context: parameters,
					eventBus: self._eventBus,
					modulesByNames: modulesByNames,
					placeholderIds: Object.keys(placeholdersByIds),
					placeholdersByIds: placeholdersByIds
				},
				transformStream = new PlaceholderTransform(renderingParameters),
				renderStream = new ModuleReadable(
					mainModule, mainModule.rootPlaceholder,
					renderingParameters
				);

			transformStream.foundHeadHandler = function () {
				return renderStream.getInlineScript();
			};

			renderStream.on('error', function (error) {
				self._eventBus.emit('error', error);
			});

			transformStream.on('error', function (error) {
				self._eventBus.emit('error', error);
			});

			try {
				renderStream.render();
			} catch (e) {
				next(e);
				return;
			}

			response.writeHead(200, RESPONSE_HEADERS);

			renderStream
				.pipe(transformStream)
				.pipe(response)
				.on('end', function () {
					self._eventBus.emit('pageRendered', parameters);
				});
		});
};

/**
 * Promises something when renderer is ready to handle requests.
 * @returns {Promise} Promise for nothing.
 * @private
 */
PageRenderer.prototype._getPromiseForReadyState = function () {
	return this._modulesLoading ?
		this._modulesLoading :
		Promise.resolve();
};