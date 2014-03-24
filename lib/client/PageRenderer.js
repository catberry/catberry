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
	url = require('url'),
	PageRendererBase = require('../PageRendererBase');

util.inherits(PageRenderer, PageRendererBase);

var NON_MODULE_NAME_REGEXP = /^\$(.)*/,
	TRACE_RENDER_PLACEHOLDER = 'Render placeholder "%s" of module "%s"';

/**
 * Creates instance of client-side page renderer.
 * @param {ModuleLoader} $moduleLoader Module loader to load modules set.
 * @param {Window} $window Browser window to render content.
 * @param {Logger} $logger Logger to log messages.
 * @constructor
 * @extends PageRendererBase
 */
function PageRenderer($moduleLoader, $window, $logger) {
	PageRendererBase.call(this, $moduleLoader, $logger);
	this._window = $window;
}

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
PageRenderer.prototype._window = null;

/**
 * Renders changed placeholders at client-side.
 * @param {Object} parametersByModules Set of parameters.
 * @param {Function} next Next function.
 */
PageRenderer.prototype.render = function (parametersByModules, next) {
	var self = this,
		queue,
		currentModule,
		currentModuleName,
		rendered = {};

	var placeholderCheck = function (placeholderName) {
		var id = self._joinModuleNameAndContext(currentModule.name,
				placeholderName),
			element = self._window.document.getElementById(id);

		if (!element) {
			return;
		}

		var item = Object.create(currentModule.placeholders[placeholderName]);
		item.element = element;
		self._renderTraverse(rendered, parametersByModules, item,
			function () {
				if (queue.length === 0) {
					next();
				}
			});
	};

	queue = Object.keys(parametersByModules.$global).length > 0 ?
		// call render for all placeholders which are there in page
		Object.keys(this._modulesByNames) :
		// call render only for modules with changed parameters
		Object.keys(parametersByModules);

	while (queue.length > 0) {
		currentModuleName = queue.shift();
		if (NON_MODULE_NAME_REGEXP.test(currentModuleName)) {
			continue;
		}
		currentModule = this._modulesByNames[currentModuleName];

		Object.keys(currentModule.placeholders)
			.forEach(placeholderCheck);
	}
};

/**
 * Does rendering traversal through all placeholders hierarchy.
 * @param {Object} rendered Set of rendered placeholders.
 * @param {Object} parameters Set of parameters.
 * @param {Object} item Placeholder item to render.
 * @param {Function} callback Callback on finish.
 * @private
 */
PageRenderer.prototype._renderTraverse =
	function (rendered, parameters, item, callback) {
		var queue = [item],
			iteration = this._getIterationAction(rendered, queue, parameters,
				callback);
		iteration();
	};

/**
 * Gets action function for one traversal iteration.
 * @param {Object} rendered Set of rendered placeholders.
 * @param {Array} queue Queue of placeholder items to render.
 * @param {Object} parameters Set of parameters.
 * @param {Function} callback Callback function on finish.
 * @returns {Function}
 * @private
 */
PageRenderer.prototype._getIterationAction =
	function (rendered, queue, parameters, callback) {
		var self = this;

		// traversal iteration action
		var iterationAction = function () {
			var currentItem = queue.shift(),
				currentId = currentItem.element.id,
				currentParameters = parameters[currentItem.moduleName] || {},
				currentHtml,
				currentModule = self._modulesByNames[currentItem.moduleName];

			// html forming end handler
			var endHandler = function () {
				currentItem.element.innerHTML = currentHtml;
				rendered[currentId].html = currentHtml;
				// check if placeholder has something to render inside itself
				self._placeholderIds
					.forEach(function (id) {
						if (id === currentId) {
							return;
						}
						var placeholderElement =
							currentItem.element.querySelector('#' + id);
						if (!placeholderElement) {
							return;
						}

						var item =
							Object.create(self._placeholdersByIds[id]);
						item.element = placeholderElement;
						queue.push(item);
					});
				endCheckAction();
			};

			// module render data handler
			var dataHandler = function (error, data) {
				if (error) {
					self._logger.error(error);
					rendered[currentItem.id] = {
						data: null,
						html: ''
					};
					endCheckAction();
					return;
				}

				if (!(currentId in rendered)) {
					rendered[currentId] = {
						data: data,
						html: ''
					};
				}

				currentHtml = rendered[currentId].html || '';

				if (currentHtml.length === 0) {
					self._logger.trace(util.format(TRACE_RENDER_PLACEHOLDER,
						currentItem.name, currentItem.moduleName));

					var stream = currentItem.getTemplateStream(data);
					stream.on('data', function (chunk) {
						currentHtml += chunk;
					});
					stream.on('end', endHandler);
				} else {
					endHandler();
				}
			};

			try {
				if (currentId in rendered) {
					dataHandler(null, rendered[currentId].data);
				} else {
					currentModule.implementation.render(currentItem.name,
						currentParameters, dataHandler);
				}
			} catch (e) {
				self._logger.error(e);
				endCheckAction();
			}
		};

		// determines is required to continue process the queue
		var endCheckAction = function () {
			if (queue.length > 0) {
				setTimeout(iterationAction, 0);
			} else {
				callback();
			}
		};

		return iterationAction;
	};