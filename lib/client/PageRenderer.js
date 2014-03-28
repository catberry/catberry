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
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	PageRendererBase = require('../PageRendererBase');

util.inherits(PageRenderer, PageRendererBase);

var TRACE_RENDER_PLACEHOLDER = 'Render placeholder "%s" of module "%s"',
	ID_ATTRIBUTE_NAME = 'id',
	LOADING_CLASS_NAME = 'loading',
	BODY_ELEMENT_NAME = 'BODY',
	ERROR_FORMAT = '%s<br/>%s';

/**
 * Creates instance of client-side page renderer.
 * @param {ModuleLoader} $moduleLoader Module loader to load modules set.
 * @param {Window} $window Browser window to render content.
 * @param {Logger} $logger Logger to log messages.
 * @param {jQuery} $jQuery jQuery library instance.
 * @param {boolean} isRelease Is application mode release.
 * @constructor
 * @extends PageRendererBase
 */
function PageRenderer($moduleLoader, $window, $logger, $jQuery, isRelease) {
	PageRendererBase.call(this, $moduleLoader, $logger, isRelease);
	this._window = $window;
	this.$ = $jQuery;
}

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
PageRenderer.prototype._window = null;

/**
 * Current jQuery instance.
 * @type {jQuery}
 */
PageRenderer.prototype.$ = null;

/**
 * Renders changed placeholders at client-side.
 * @param {Object} parametersByModules Set of parameters.
 * @param {Function} next Next function.
 */
PageRenderer.prototype.render = function (parametersByModules, next) {
	var self = this,
		queue,
		moduleNames,
		currentModule,
		currentModuleName,
		rendered = {};

	moduleNames = Object.keys(parametersByModules.$global).length > 0 ?
		// call render for all placeholders which are there in page
		this._modulesByNames :
		// call render only for modules with changed parameters
		parametersByModules;

	queue = Object.keys(moduleNames);

	var searchRenderingRoot = function () {
		currentModuleName = queue.shift();
		currentModule = self._modulesByNames[currentModuleName];

		self.renderModule(currentModule, parametersByModules, moduleNames,
			rendered, endCheckAction);
	};

	// determines is required to continue process the queue
	var endCheckAction = function () {
		if (queue.length > 0) {
			setTimeout(searchRenderingRoot, 0);
		} else {
			next();
		}
	};

	// initial check to start queue processing
	endCheckAction();
};

/**
 * Renders module placeholders.
 * @param {Object} module Module object.
 * @param {Object} parameters Set of parameters by module names.
 * @param {Object} modulesToRender Set of module names which need to be rendered.
 * @param {Object} rendered Set of rendered placeholder IDs.
 * @param {Function} callback Callback on finish.
 */
PageRenderer.prototype.renderModule =
	function (module, parameters, modulesToRender, rendered, callback) {
		var self = this,
			currentModuleName = module.name;

		Object.keys(module.placeholders)
			.forEach(function (placeholderName) {
				// root placeholders impossible to process
				if (moduleContextHelper.isRootPlaceholder(placeholderName)) {
					return;
				}
				if (moduleContextHelper.isErrorPlaceholder(placeholderName)) {
					return;
				}
				// now search root of rendering for each placeholder
				// of changed module
				var id = moduleContextHelper.joinModuleNameAndContext(
						currentModuleName, placeholderName),
					element = self.$('#' + id),
					currentElement,
					currentId,
					lastRenderingRootId,
					tmpPlaceholder;

				if (element.length === 0) {
					return;
				}
				currentElement = element;
				currentId = element.attr(ID_ATTRIBUTE_NAME);
				lastRenderingRootId = currentId;

				// traverse bottom to top and search placeholders
				// of current module and save last found
				while (currentElement.tagName !== BODY_ELEMENT_NAME) {
					currentElement = currentElement.parent();
					currentId = currentElement.attr(ID_ATTRIBUTE_NAME);
					if (currentElement.length === 0) {
						break;
					}
					tmpPlaceholder =
						self._placeholdersByIds[currentId];

					if (!tmpPlaceholder) {
						continue;
					}

					if (modulesToRender.hasOwnProperty(tmpPlaceholder.moduleName)) {
						lastRenderingRootId =
							currentElement.attr(ID_ATTRIBUTE_NAME);
					}
				}

				if (lastRenderingRootId in rendered) {
					callback();
					return;
				}
				self.renderPlaceholder(self._placeholdersByIds[lastRenderingRootId],
					parameters, rendered, callback);
			});
	};

/**
 * Does rendering traversal through all placeholders hierarchy.
 * @param {Object} rendered Set of rendered placeholders.
 * @param {Object} parameters Set of parameters.
 * @param {Object} placeholder Placeholder to render.
 * @param {Function} callback Callback on finish.
 */
PageRenderer.prototype.renderPlaceholder =
	function (placeholder, parameters, rendered, callback) {
		var item = Object.create(placeholder);
		item.id = moduleContextHelper.joinModuleNameAndContext(
			placeholder.moduleName, placeholder.name);
		item.element = this.$('#' + item.id);

		if (item.element.length === 0) {
			callback();
			return;
		}

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
				currentParameters = parameters[currentItem.moduleName] || {},
				currentModule = self._modulesByNames[currentItem.moduleName];

			var errorHandler = function (error) {
				self._logger.error(error);
				if (!self._isRelease && error instanceof Error) {
					currentItem.element.empty();
					currentItem.element.html(util.format(ERROR_FORMAT,
						error.message, error.stack));
					currentItem.element.removeClass(LOADING_CLASS_NAME);
					endCheckAction();
				} else if (currentModule.errorPlaceholder) {
					streamHandler(
						currentModule.errorPlaceholder.getTemplateStream(error));
				} else {
					currentItem.element.empty();
					currentItem.element.removeClass(LOADING_CLASS_NAME);
				}
			};

			var streamHandler = function (stream) {
				currentItem.element.empty();
				stream.on('data', function (chunk) {
					currentItem.element.append(chunk);
				});
				stream.on('error', function (error) {
					errorHandler(error);
					endCheckAction();
				});
				stream.on('end', function () {
					currentItem.element.removeClass(LOADING_CLASS_NAME);
					checkInner();
				});
			};

			// checks if placeholder has something to render inside itself
			var checkInner = function () {
				self._placeholderIds
					.forEach(function (id) {
						if (id === currentItem.id) {
							return;
						}
						var placeholderElement = currentItem.element
							.find('#' + id);
						if (placeholderElement.length === 0) {
							return;
						}

						var item = Object
							.create(self._placeholdersByIds[id]);
						item.element = placeholderElement;
						item.id = id;
						queue.push(item);
					});
				endCheckAction();
			};

			// module render data handler
			var dataHandler = function (error, data) {
				if (error) {
					errorHandler(error);
					return;
				}

				// if module do not wish to render itself again
				if (!error && !data) {
					currentItem.element.removeClass(LOADING_CLASS_NAME);
					checkInner();
					return;
				}

				self._logger.trace(util.format(TRACE_RENDER_PLACEHOLDER,
					currentItem.name, currentItem.moduleName));

				streamHandler(currentItem.getTemplateStream(data));
			};

			try {
				if (currentItem.id in rendered) {
					endCheckAction();
					return;
				}

				rendered[currentItem.id] = true;
				currentItem.element.addClass(LOADING_CLASS_NAME);
				currentModule.implementation.render(currentItem.name,
					currentParameters, dataHandler);
			} catch (e) {
				errorHandler(e);
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