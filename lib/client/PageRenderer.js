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
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	PageRendererBase = require('../PageRendererBase');

util.inherits(PageRenderer, PageRendererBase);

var TRACE_RENDER_PLACEHOLDER = 'Render placeholder "%s" of module "%s"',
	ID_ATTRIBUTE_NAME = 'id',
	NAME_TO_FILTER = '$$',
	LOADING_CLASS_NAME = 'loading',
	BODY_ELEMENT_NAME = 'BODY',
	ERROR_FORMAT = '%s<br/>%s';

/**
 * Creates instance of client-side page renderer.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @param {ModuleLoader} $moduleLoader Module loader to load modules set.
 * @param {Logger} $logger Logger to log messages.
 * @param {boolean} isRelease Is application mode release.
 * @constructor
 * @extends PageRendererBase
 */
function PageRenderer($serviceLocator, $moduleLoader, $logger, isRelease) {
	PageRendererBase.call(this, $moduleLoader, $logger, isRelease);
	this._window = $serviceLocator.resolve('window');
	this.$ = $serviceLocator.resolve('jQuery');
}

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
PageRenderer.prototype._window = null;

/**
 * Last map of parameters by module names.
 * @type {Object}
 */
PageRenderer.prototype.lastParameters = {};

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

	// call render for all placeholders which are there in page
	if (Object.keys(parametersByModules.$global).length > 0) {
		moduleNames = this._modulesByNames;
		queue = Object.keys(moduleNames);
	} else {
		// call render only for modules with changed parameters
		moduleNames = {};
		queue = this._getChangedModuleNames(parametersByModules);
		queue.forEach(function (moduleName) {
			moduleNames[moduleName] = true;
		});
	}

	this.lastParameters = parametersByModules;

	var searchRenderingRoot = function () {
		currentModuleName = queue.shift();
		currentModule = self._modulesByNames[currentModuleName];

		if (!currentModule) {
			endCheckAction();
			return;
		}

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
			lastError,
			current,
			currentModuleName = module.name,
			placeholdersNames = Object.keys(module.placeholders);

		var endHandler = function (error) {
			if (error) {
				lastError = error;
			}
			if (placeholdersNames.length === 0) {
				callback(lastError);
				return;
			}

			iteration();
		};

		var iteration = function () {
			current = placeholdersNames.shift();
			// root placeholders impossible to process
			if (moduleContextHelper.isRootPlaceholder(current)) {
				endHandler();
				return;
			}
			if (moduleContextHelper.isErrorPlaceholder(current)) {
				endHandler();
				return;
			}
			// now search root of rendering for each placeholder
			// of changed module
			var id = moduleContextHelper.joinModuleNameAndContext(
					currentModuleName, current),
				element = self.$('#' + id),
				currentElement,
				currentId,
				lastRenderingRootId,
				tmpPlaceholder;

			if (element.length === 0) {
				endHandler();
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
				endHandler();
				return;
			}
			self.renderPlaceholder(self._placeholdersByIds[lastRenderingRootId],
				parameters, rendered, endHandler);
		};

		iteration();
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
				currentParameters = parameters[currentItem.moduleName],
				currentModule = self._modulesByNames[currentItem.moduleName];
			if (!currentParameters) {
				currentParameters = Object.create(parameters.$$.$global);
				currentParameters.$$ = parameters.$$;
			}

			if (!(currentItem.moduleName in parameters.$$.$context)) {
				parameters.$$.$context[currentItem.moduleName] = {};
			}

			var moduleContext = parameters.$$.$context[currentItem.moduleName];

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
					endCheckAction();
				}
			};

			var streamHandler = function (stream) {
				currentItem.element.empty();
				stream.on('data', function (chunk) {
					currentItem.element.append(chunk.toString());
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
			var dataHandler = function (error, data, then) {
				then = typeof(then) === 'function' ? then : dummy;

				if (error) {
					errorHandler(error);
					then();
					return;
				}

				// if module do not wish to render itself again
				if (!error && !data) {
					currentItem.element.removeClass(LOADING_CLASS_NAME);
					checkInner();
					then();
					return;
				}

				moduleContext[currentItem.name] = data;
				self._logger.trace(util.format(TRACE_RENDER_PLACEHOLDER,
					currentItem.name, currentItem.moduleName));

				var stream = currentItem.getTemplateStream(data);
				stream.on('end', then);
				streamHandler(stream);
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

/**
 * Gets array of module names which parameters
 * were changed since last rendering process.
 * @param {Object} parameterByModules Parameters map by module names.
 * @returns {Array<string>} Filtered module names.
 * @private
 */
PageRenderer.prototype._getChangedModuleNames = function (parameterByModules) {
	var self = this,
	// some module's parameters can be removed since last time
		changed = Object.keys(this.lastParameters)
			.filter(function (moduleName) {
				return moduleName !== NAME_TO_FILTER &&
					!(moduleName in parameterByModules);
			});

	Object.keys(parameterByModules)
		.forEach(function (moduleName) {
			if (moduleName === NAME_TO_FILTER) {
				return;
			}
			// new parameters were set for module
			if (!(moduleName in self.lastParameters)) {
				changed.push(moduleName);
				return;
			}

			// new and last parameters has different values
			var lastParameterNames =
					Object.keys(self.lastParameters[moduleName]),
				currentParameterNames = Object.keys(parameterByModules[moduleName]);

			if (currentParameterNames.length !== lastParameterNames.length) {
				changed.push(moduleName);
				return;
			}

			currentParameterNames.every(function (parameterName) {
				if (parameterName === NAME_TO_FILTER) {
					return true;
				}
				if (parameterByModules[moduleName][parameterName] !==
					self.lastParameters[moduleName][parameterName]) {
					changed.push(moduleName);
					return false;
				}
				return true;
			});
		});
	return changed;
};

/**
 * Does nothing as default callback.
 */
function dummy() {}