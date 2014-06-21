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
	LOADING_CLASS_NAME = 'loading',
	HTML_ELEMENT_NAME = 'HTML',
	HEAD_ELEMENT_NAME = 'HEAD',
	TITLE_ELEMENT_NAME = 'TITLE',
	BASE_ELEMENT_NAME = 'BASE',
	STYLE_ELEMENT_NAME = 'STYLE',
	SCRIPT_ELEMENT_NAME = 'SCRIPT',
	NOSCRIPT_ELEMENT_NAME = 'NOSCRIPT',
	META_ELEMENT_NAME = 'META',
	LINK_ELEMENT_NAME = 'LINK',
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
	var stateProvider = $serviceLocator.resolve('stateProvider');
	this._lastState = stateProvider.getStateByUrl(
		this._window.location.toString());
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
 * @param {Object} renderingParameters Set of parameters.
 * @param {Function} next Next function.
 */
PageRenderer.prototype.render = function (renderingParameters, next) {
	var self = this,
		queue,
		moduleNames,
		currentModule,
		currentModuleName,
		rendered = {};

	// call render only for modules with changed parameters
	moduleNames = {};
	queue = this._getNamesOfChangedModules(renderingParameters.state);
	queue.forEach(function (moduleName) {
		moduleNames[moduleName] = true;
		var module = self._modulesByNames[moduleName];
		module.implementation.$context = {
			name: moduleName,
			cookies: renderingParameters.cookies,
			renderedData: renderingParameters.renderedData,
			state: renderingParameters.state[moduleName] || {}
		};
	});

	this._lastState = renderingParameters.state;

	var moduleRenderingAction = function () {
		currentModuleName = queue.shift();
		currentModule = self._modulesByNames[currentModuleName];
		self.renderModule(currentModule, renderingParameters, moduleNames,
			rendered, endCheckAction);
	};

	// determines is required to continue process the queue
	var endCheckAction = function () {
		if (queue.length > 0) {
			setTimeout(moduleRenderingAction, 0);
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
			// root and error placeholders impossible to process
			if (moduleContextHelper.isRootPlaceholder(current) ||
				moduleContextHelper.isErrorPlaceholder(current)) {
				endHandler();
				return;
			}

			// now search root of rendering for each placeholder
			// of changed module
			var id = moduleContextHelper.joinModuleNameAndContext(
					currentModuleName, current),
				renderingRootId = self._findRenderingRoot(id, modulesToRender);

			if (!renderingRootId || (renderingRootId in rendered)) {
				endHandler();
				return;
			}
			self.renderPlaceholder(self._placeholdersByIds[renderingRootId],
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

		var self = this,
			queue = [item],
			context = {
				modulesByNames: this._modulesByNames,
				queue: queue,
				rendered: rendered,
				parameters: parameters,
				pendingCounter: 1,
				// determines is required to continue process the queue
				next: function () {
					context.pendingCounter--;
					if (queue.length === 0 && context.pendingCounter === 0) {
						callback();
						return;
					}
					context.pendingCounter++;
					setTimeout(function () {
						self._renderNextInContext(context);
					}, 0);
				}
			};

		context.next();
	};

/**
 * Renders next item from queue in rendering context.
 * @param {Object} context Rendering context.
 * @private
 */
PageRenderer.prototype._renderNextInContext = function (context) {
	var self = this,
		innerContext;

	while (context.queue.length !== 0) {
		innerContext = Object.create(context);
		innerContext.currentItem = context.queue.shift();

		if (innerContext.currentItem.id in context.rendered) {
			context.next();
			return;
		}

		innerContext.currentModule =
			context.modulesByNames[innerContext.currentItem.moduleName];

		try {
			innerContext.rendered[innerContext.currentItem.id] = true;
			innerContext.currentItem.element.addClass(LOADING_CLASS_NAME);
			innerContext.currentModule.implementation
				.render(innerContext.currentItem.name,
				self._handleRenderingData.bind(self, innerContext));
		} catch (e) {
			self._handleRenderingError(innerContext, e);
			context.next();
		}
	}
};

/**
 * Handles rendering errors.
 * @param {Object} context Rendering context.
 * @param {Error} error Rendering error.
 * @private
 */
PageRenderer.prototype._handleRenderingError = function (context, error) {
	this._logger.error(error);
	if (!this._isRelease && error instanceof Error) {
		context.currentItem.element.empty();
		context.currentItem.element.html(util.format(ERROR_FORMAT,
			error.message, error.stack));
		context.currentItem.element.removeClass(LOADING_CLASS_NAME);
		context.next();
	} else if (context.currentModule.errorPlaceholder) {
		this._handleRenderingStream(
			context,
			context.currentModule.errorPlaceholder.getTemplateStream(error));
	} else {
		context.currentItem.element.empty();
		context.currentItem.element.removeClass(LOADING_CLASS_NAME);
		context.next();
	}
};

/**
 * Handles placeholder rendering stream.
 * @param {Object} context Rendering context.
 * @param {Stream} stream Rendering stream.
 * @private
 */
PageRenderer.prototype._handleRenderingStream = function (context, stream) {
	var self = this;

	stream.on('error', function (error) {
		self._handleRenderingError(context, error);
		context.next();
	});
	stream.on('end', function () {
		context.currentItem.element.removeClass(LOADING_CLASS_NAME);
	});

	if (context.currentItem.element[0].tagName === HEAD_ELEMENT_NAME) {
		var data = '';
		stream.on('data', function (chunk) {
			data += chunk.toString();
		});
		stream.on('end', function () {
			self._mergeHead(context.currentItem.element, data);
			context.next();
		});
		return;
	}

	context.currentItem.element.empty();
	stream.on('data', function (chunk) {
		context.currentItem.element.append(chunk.toString());
	});
	stream.on('end', function () {
		self._addNestedToRenderQueue(context);
	});
};

/**
 * Adds nested placeholders to rendering queue of rendering context.
 * @param {Object} context Rendering context.
 * @private
 */
PageRenderer.prototype._addNestedToRenderQueue = function (context) {
	var self = this;

	this._placeholderIds
		.forEach(function (id) {
			if (id === context.currentItem.id) {
				return;
			}
			var placeholderElement = context.currentItem.element
				.find('#' + id);
			if (placeholderElement.length === 0) {
				return;
			}

			var item = Object
				.create(self._placeholdersByIds[id]);
			item.element = placeholderElement;
			item.id = id;
			context.queue.push(item);
		});
	context.next();
};

/**
 * Handles data from module's render method.
 * @param {Object} context Rendering context.
 * @param {Error|null} error Possible rendering error.
 * @param {Object|null} data Template data context.
 * @param {Function?} then Then function.
 * @private
 */
PageRenderer.prototype._handleRenderingData =
	function (context, error, data, then) {
		then = typeof(then) === 'function' ? then : dummy;

		if (error) {
			this._handleRenderingError(context, error);
			then();
			return;
		}

		// if module do not wish to render itself again
		if (!error && !data) {
			context.currentItem.element.removeClass(LOADING_CLASS_NAME);
			this._addNestedToRenderQueue(context);
			then();
			return;
		}

		this._logger.trace(util.format(TRACE_RENDER_PLACEHOLDER,
			context.currentItem.name, context.currentItem.moduleName));

		var stream = context.currentItem.getTemplateStream(data);
		stream.on('end', then);
		this._handleRenderingStream(context, stream);
	};

/**
 * Gets array of module names which parameters
 * were changed since last rendering process.
 * @param {Object} commonState State map by module names.
 * @returns {Array<string>} Filtered module names.
 * @private
 */
PageRenderer.prototype._getNamesOfChangedModules =
	function (commonState) {
		var self = this,
		// some module's parameters can be removed since last time
			changed = Object.keys(this._lastState)
				.filter(function (moduleName) {
					return !(moduleName in commonState);
				});

		Object.keys(commonState)
			.forEach(function (moduleName) {
				// new parameters were set for module
				if (!(moduleName in self._lastState)) {
					changed.push(moduleName);
					return;
				}

				// new and last parameters has different values
				var lastParameterNames =
						Object.keys(self._lastState[moduleName]),
					currentParameterNames =
						Object.keys(commonState[moduleName]);

				if (currentParameterNames.length !==
					lastParameterNames.length) {
					changed.push(moduleName);
					return;
				}

				currentParameterNames.every(function (parameterName) {
					if (commonState[moduleName][parameterName] !==
						self._lastState[moduleName][parameterName]) {
						changed.push(moduleName);
						return false;
					}
					return true;
				});
			});
		return changed;
	};

/**
 * Finds rendering root fot specified placeholder.
 * @param {string} id Placeholder ID.
 * @param {Object} modulesToRender Set of modules which should be rendered.
 * @returns {string|null} ID of last found rendering root.
 */
PageRenderer.prototype._findRenderingRoot = function (id, modulesToRender) {
	var element = this.$('#' + id),
		currentElement,
		currentId,
		lastRenderingRootId,
		tmpPlaceholder;

	if (element.length === 0) {
		return null;
	}

	currentElement = element;
	currentId = element.attr(ID_ATTRIBUTE_NAME);
	lastRenderingRootId = currentId;
	// traverse bottom to top and search placeholders
	// of current module and save last found
	while (currentElement.tagName !== HTML_ELEMENT_NAME) {
		currentElement = currentElement.parent();
		currentId = currentElement.attr(ID_ATTRIBUTE_NAME);
		if (currentElement.length === 0) {
			break;
		}
		tmpPlaceholder =
			this._placeholdersByIds[currentId];

		if (!tmpPlaceholder) {
			continue;
		}

		if (modulesToRender.hasOwnProperty(tmpPlaceholder.moduleName)) {
			lastRenderingRootId =
				currentElement.attr(ID_ATTRIBUTE_NAME);
		}
	}

	return lastRenderingRootId;
};

/**
 * Merges new and existed head elements and change only difference.
 * @param {jQuery} head jQuery selector of HEAD element.
 * @param {string} htmlText HTML of new HEAD element content.
 * @private
 */
PageRenderer.prototype._mergeHead = function (head, htmlText) {
	var self = this,
		newItems = this.$(htmlText);

	var map = this._getHeadMap(head.children()),
		sameMetaElements = {};

	// now add not existed items to head
	/*jshint maxcomplexity:false */
	newItems.each(function () {
		var wrapped = self.$(this), key, oldKey, oldItem;
		if (!(this.tagName in map)) {
			map[this.tagName] = {};
		}

		switch (this.tagName) {
			// these elements can be only replaced
			case TITLE_ELEMENT_NAME:
			case BASE_ELEMENT_NAME:
			case NOSCRIPT_ELEMENT_NAME:
				key = self._getElementKey(wrapped);
				oldItem = head.find(this.tagName);
				if (oldItem.length !== 0) {
					oldKey = self._getElementKey(oldItem);
					oldItem.replaceWith(wrapped);
				} else {
					head.append(wrapped);
				}
				break;

			// meta elements can be deleted
			// but we should not delete and append same elements
			case META_ELEMENT_NAME:
				key = self._getElementKey(wrapped);
				if (key in map[this.tagName]) {
					sameMetaElements[key] = true;
				} else {
					head.append(wrapped);
				}
				break;

			// these elements can not be deleted from head
			// therefore we just add new elements that differs from existed
			case STYLE_ELEMENT_NAME:
			case LINK_ELEMENT_NAME:
			case SCRIPT_ELEMENT_NAME:
				key = self._getElementKey(wrapped);
				if (!(key in map[this.tagName])) {
					head.append(wrapped);
				}
				break;
		}
	});

	if (META_ELEMENT_NAME in map) {
		// remove meta tags which a not in a new head state
		Object.keys(map[META_ELEMENT_NAME])
			.forEach(function (metaKey) {
				if (metaKey in sameMetaElements) {
					return;
				}

				map[META_ELEMENT_NAME][metaKey].remove();
			});
	}
};

/**
 * Gets map of all HEAD's elements.
 * @param {jQuery} headItems jQuery selector of head elements.
 * @returns {Object} Map of HEAD elements.
 * @private
 */
PageRenderer.prototype._getHeadMap = function (headItems) {
	// Create map of <meta>, <link>, <style> and <script> tags
	// by unique keys that contain attributes and content
	var map = {},
		self = this;

	headItems.each(function () {
		var wrapped = self.$(this);
		if (!(this.tagName in map)) {
			map[this.tagName] = {};
		}
		map[this.tagName][self._getElementKey(wrapped)] = wrapped;
	});
	return map;
};

/**
 * Gets unique element key using attributes and its content.
 * @param {jQuery} item jQuery selector of elements.
 * @returns {string} Unique key for element.
 * @private
 */
PageRenderer.prototype._getElementKey = function (item) {
	var content = item.length === 0 ? '' : item.html(),
		attributes = [];

	this.$(item[0].attributes)
		.each(function () {
			attributes.push(this.nodeName + '=' + this.nodeValue);
		});
	return attributes
		.sort()
		.join('|') + content;
};
/**
 * Does nothing as default callback.
 */
function dummy() {}