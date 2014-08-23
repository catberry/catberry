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
	errorHelper = require('../helpers/errorHelper'),
	moduleContextHelper = require('../helpers/moduleContextHelper'),
	PageRendererBase = require('../PageRendererBase');

util.inherits(PageRenderer, PageRendererBase);

var SCROLL_TOP_ATTRIBUTE = 'data-scroll-top',
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
	LINK_ELEMENT_NAME = 'LINK';

/**
 * Creates instance of client-side page renderer.
 * @param {ServiceLocator} $serviceLocator Service locator
 * to resolve dependencies.
 * @param {ModuleLoader} $moduleLoader Module loader to load modules set.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @param {boolean} isRelease Is application mode release.
 * @constructor
 * @extends PageRendererBase
 */
function PageRenderer($serviceLocator, $moduleLoader, $eventBus, isRelease) {
	PageRendererBase.call(this, $moduleLoader, $eventBus, isRelease);
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
		modulesByNames = this._moduleLoader.getModulesByNames(),
		moduleNames = {},
		rendered = {},
	// call render only for modules with changed parameters
		queue = this._getNamesOfChangedModules(renderingParameters.state);

	Object.keys(modulesByNames)
		.forEach(function (moduleName) {
			var module = modulesByNames[moduleName];
			module.implementation.$context = Object.create(renderingParameters);
			module.implementation.$context.name = moduleName;
			module.implementation.$context.state =
				renderingParameters.state[moduleName] || {};
		});
	queue.forEach(function (moduleName) {
		moduleNames[moduleName] = true;
	});

	this._lastState = renderingParameters.state;

	var moduleRenderingAction = function () {
		var currentModuleName = queue.shift(),
			currentModule = modulesByNames[currentModuleName];
		if (!currentModule) {
			endCheckAction();
			return;
		}
		self.renderModule(currentModule, renderingParameters, moduleNames,
			rendered, endCheckAction);
	};

	// determines is required to continue process the queue
	var endCheckAction = function () {
		if (queue.length > 0) {
			moduleRenderingAction();
		} else {
			self._eventBus.emit('pageRendered', renderingParameters);
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
			placeholdersByIds = this._moduleLoader.getPlaceholdersByIds(),
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
			var current = placeholdersNames.shift();
			// root and error placeholders impossible to process
			if (!current ||
				moduleContextHelper.isRootPlaceholder(current) ||
				moduleContextHelper.isErrorPlaceholder(current)) {
				endHandler();
				return;
			}

			// now search root of rendering for each placeholder
			// of changed module
			var id = moduleContextHelper.joinModuleNameAndContext(
					module.name, current),
				renderingRootId = self._findRenderingRoot(id, modulesToRender);

			if (!renderingRootId || (renderingRootId in rendered)) {
				endHandler();
				return;
			}
			self.renderPlaceholder(placeholdersByIds[renderingRootId],
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

		if (item.element.length === 0 || (item.id in rendered)) {
			callback();
			return;
		}

		var self = this,
			thenFunctions = [],
			queue = [item],
			scrolledTop = false,
			context = {
				modulesByNames: this._moduleLoader.getModulesByNames(),
				queue: queue,
				rendered: rendered,
				parameters: parameters,
				pendingCounter: 1,
				needToScrollTop: false,
				registerThen: function (then) {
					thenFunctions.push(then);
				},
				// determines is required to continue process the queue
				next: function () {
					if (context.needToScrollTop && !scrolledTop) {
						self.$(self._window).scrollTop(0);
						scrolledTop = true;
					}
					context.pendingCounter--;
					if (queue.length === 0 && context.pendingCounter === 0) {
						thenFunctions.forEach(function (then) {
							then();
						});
						callback();
						return;
					}
					context.pendingCounter++;
					self._renderNextInContext(context);
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
	var currentItem = context.queue.shift();

	if (!currentItem || (currentItem.id in context.rendered)) {
		context.next();
		return;
	}
	context.rendered[currentItem.id] = true;

	var currentContext = Object.create(context);
	currentContext.currentItem = currentItem;

	// element can declare that after it renders need to scroll top
	if (currentItem.element.attr(SCROLL_TOP_ATTRIBUTE)) {
		context.needToScrollTop = true;
	}

	currentContext.currentModule =
		context.modulesByNames[currentItem.moduleName];
	currentItem.element.addClass(LOADING_CLASS_NAME);

	try {
		this._eventBus.emit('placeholderRender', {
			name: currentItem.name,
			moduleName: currentItem.moduleName,
			element: currentItem.element,
			context: currentContext.currentModule.implementation.$context
		});
		currentContext.currentModule.implementation.render(currentItem.name,
			this._handleRenderingData.bind(this, currentContext));
	} catch (e) {
		this._handleRenderingError(currentContext, e);
	}
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
		if (typeof(then) === 'function') {
			context.registerThen(then);
		}

		if (error) {
			this._handleRenderingError(context, error);
			return;
		}

		var stream = context.currentItem.getTemplateStream(data || {});
		this._handleRenderingStream(context, stream);
	};

/**
 * Handles placeholder rendering stream.
 * @param {Object} context Rendering context.
 * @param {Stream} stream Rendering stream.
 * @private
 */
PageRenderer.prototype._handleRenderingStream =
	function (context, stream) {
		var self = this,
			eventArgs = {
				name: context.currentItem.name,
				moduleName: context.currentItem.moduleName,
				element: context.currentItem.element,
				context: context.currentModule.implementation.$context
			};

		stream.on('error', function (error) {
			self._handleRenderingError(context, error);
			context.next();
		});

		var data = '',
			startTime = Date.now();

		if (context.currentItem.element[0].tagName === HEAD_ELEMENT_NAME) {
			stream.on('data', function (chunk) {
				data += chunk;
			});
			stream.on('end', function () {
				self._mergeHead(context.currentItem.element, data);
				eventArgs.time = Date.now() - startTime;
				context.currentItem.element.removeClass(LOADING_CLASS_NAME);
				self._eventBus.emit('placeholderRendered', eventArgs);
				context.next();
			});
			return;
		}

		stream.on('data', function (chunk) {
			data += chunk;
		});
		stream.on('end', function () {
			context.currentItem.element.html(data);
			eventArgs.time = Date.now() - startTime;
			context.currentItem.element.removeClass(LOADING_CLASS_NAME);
			self._eventBus.emit('placeholderRendered', eventArgs);
			self._addNestedToRenderQueue(context);
		});
	};

/**
 * Handles rendering errors.
 * @param {Object} context Rendering context.
 * @param {Error} error Rendering error.
 * @private
 */
PageRenderer.prototype._handleRenderingError = function (context, error) {
	this._eventBus.emit('error', error);
	if (!this._isRelease && error instanceof Error) {
		context.currentItem.element.html(
			errorHelper.prettyPrint(error, context.parameters.userAgent));
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
 * Adds nested placeholders to rendering queue of rendering context.
 * @param {Object} context Rendering context.
 * @private
 */
PageRenderer.prototype._addNestedToRenderQueue = function (context) {
	var placeholdersByIds = this._moduleLoader.getPlaceholdersByIds();

	Object.keys(placeholdersByIds)
		.forEach(function (id) {
			if (id in context.rendered) {
				return;
			}
			var placeholderElement = context.currentItem.element
				.find('#' + id);
			if (placeholderElement.length === 0) {
				return;
			}

			var item = Object
				.create(placeholdersByIds[id]);
			item.element = placeholderElement;
			item.id = id;
			context.queue.push(item);
		});
	context.next();
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
		// some module's parameters can be removed since last time
		var changed = Object.keys(this._lastState)
			.filter(function (moduleName) {
				return !(moduleName in commonState);
			});

		Object.keys(commonState)
			.forEach(function (moduleName) {
				// new parameters were set for module
				if (!(moduleName in this._lastState)) {
					changed.push(moduleName);
					return;
				}

				// new and last parameters has different values
				var lastParameterNames =
						Object.keys(this._lastState[moduleName]),
					currentParameterNames =
						Object.keys(commonState[moduleName]);

				if (currentParameterNames.length !==
					lastParameterNames.length) {
					changed.push(moduleName);
					return;
				}

				currentParameterNames.every(function (parameterName) {
					if (commonState[moduleName][parameterName] !==
						this._lastState[moduleName][parameterName]) {
						changed.push(moduleName);
						return false;
					}
					return true;
				}, this);
			}, this);
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
		placeholdersByIds = this._moduleLoader.getPlaceholdersByIds(),
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
		tmpPlaceholder = placeholdersByIds[currentId];

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