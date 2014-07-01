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
	PageRendererBase = require('../PageRendererBase'),
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
	this._actionQueue = [];
	$moduleLoader.loadModules(function () {
		self._areModulesLoaded = true;
		self._eventBus.emit('ready');
		self._actionQueue.forEach(function (action) {
			action();
		});
		self._actionQueue = null;
	});
}

/**
 * Current state of modules loading.
 * @type {boolean}
 * @private
 */
PageRenderer.prototype._areModulesLoaded = false;

/**
 * Current action queue to invoke when page renderer will be ready.
 * @type {Array<Function>}
 * @private
 */
PageRenderer.prototype._actionQueue = null;

/**
 * Renders response on client request with specified parameters and page name.
 * @param {http.ServerResponse} response HTTP response.
 * @param {Object} parameters Rendering context.
 * @param {Function} next Next function for middleware.
 */
PageRenderer.prototype.render =
	function (response, parameters, next) {
		var self = this;

		this._invokeWhenReady(function () {
			var modulesByNames = self._moduleLoader.getModulesByNames(),
				placeholdersByIds = self._moduleLoader.getPlaceholdersByIds(),
				mainModule = modulesByNames[MAIN_MODULE_NAME];

			if (!mainModule || !mainModule.rootPlaceholder) {
				next();
				return;
			}

			var transformStream, renderStream;

			try {
				var renderingParameters = {
					isRelease: self._isRelease,
					context: parameters,
					eventBus: self._eventBus,
					modulesByNames: modulesByNames,
					placeholderIds: Object.keys(placeholdersByIds),
					placeholdersByIds: placeholdersByIds
				};
				transformStream = new PlaceholderTransform(renderingParameters);
				renderStream = new ModuleReadable(
					mainModule, mainModule.rootPlaceholder,
					renderingParameters);

				renderStream.on('error', function (error) {
					self._eventBus.emit('error', error);
				});

				transformStream.on('error', function (error) {
					self._eventBus.emit('error', error);
				});

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
 * Invokes action when page renderer is ready.
 * @param {Function} action Action to invoke.
 * @private
 */
PageRenderer.prototype._invokeWhenReady = function (action) {
	if (this._areModulesLoaded) {
		action();
	} else {
		this._actionQueue.push(action);
	}
};