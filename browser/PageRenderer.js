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
	errorHelper = require('../lib/helpers/errorHelper'),
	moduleHelper = require('../lib/helpers/moduleHelper'),
	PageRendererBase = require('../lib/base/PageRendererBase');

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
 * Creates instance of browser page renderer.
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
		this._window.location.toString()
	);
	this._contextFactory = $serviceLocator.resolve('contextFactory');
	this._serviceLocator = $serviceLocator;
	// need to run all afterRender methods and events for placeholders
	// were rendered at server after all modules will be resolved from
	// Service Locator
	var self = this;
	setTimeout(function () {
		self._runAfterMethodsAndEvents();
	}, 0);
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
 * Renders changed placeholders in browser.
 * @param {Object} renderingParameters Set of parameters.
 * @returns {Promise} Promise for nothing.
 */
PageRenderer.prototype.render = function (renderingParameters) {
	var self = this,
		modulesByNames = this._moduleLoader.getModulesByNames(),
		placeholdersByIds = this._moduleLoader.getPlaceholdersByIds(),
		changedModuleNames = this._getNamesOfChangedModules(
			renderingParameters.state
		);

	Object.keys(modulesByNames)
		.forEach(function (moduleName) {
			var module = modulesByNames[moduleName];
			module.implementation.$context = Object.create(renderingParameters);
			module.implementation.$context.name = moduleName;
			module.implementation.$context.state =
				renderingParameters.state[moduleName] || {};
		});
	this._lastState = renderingParameters.state;

	var context = {
		rendered: {},
		afterMethods: [],
		scrolledTop: false,
		placeholdersByIds: placeholdersByIds,
		modulesByNames: modulesByNames
	};

	// we should HEAD placeholder first
	var renderPromise = Promise.resolve(),
		headPlaceholderId = this.$('head').attr('id'),
		headPlaceholder = headPlaceholderId ?
			placeholdersByIds[headPlaceholderId] :
			null;

	if (headPlaceholder && (headPlaceholder.moduleName in changedModuleNames)) {
		renderPromise = this.renderPlaceholder(
			headPlaceholder, renderingParameters, context
		);
	}

	return renderPromise
		.then(function () {
			var promises = self._findRenderingRoots(changedModuleNames)
				.filter(function (placeholder) {
					return (placeholder.fullName !== headPlaceholderId);
				})
				.map(function (placeholder) {
					return self.renderPlaceholder(
						placeholder, renderingParameters, context
					);
				});
			return Promise.all(promises);
		})
		.then(function () {
			self._eventBus.emit('pageRendered', renderingParameters);
			var afterPromises = context.afterMethods
				.map(function (afterMethod) {
					try {
						return Promise.resolve(
							afterMethod()
						);
					} catch (e) {
						return Promise.reject(e);
					}
				});
			return Promise.all(afterPromises);
		});
};

/**
 * Does rendering traversal through all placeholders hierarchy.
 * @param {Object} placeholder Placeholder to render.
 * @param {Object} parameters Set of parameters.
 * @param {Object?} renderingContext Shared context for rendering process.
 */
PageRenderer.prototype.renderPlaceholder =
	function (placeholder, parameters, renderingContext) {
		renderingContext = renderingContext || {
			rendered: {},
			afterMethods: [],
			scrolledTop: false,
			placeholdersByIds: this._moduleLoader.getPlaceholdersByIds(),
			modulesByNames: this._moduleLoader.getModulesByNames()
		};

		var element = this.$('#' + placeholder.fullName);
		if (element.length !== 1 ||
			(placeholder.fullName in renderingContext.rendered)) {
			return Promise.resolve(renderingContext);
		}
		renderingContext.rendered[placeholder.fullName] = true;

		var self = this,
			currentModule = renderingContext
				.modulesByNames[placeholder.moduleName],
			renderMethod = moduleHelper.getMethodToInvoke(
				currentModule.implementation, 'render', placeholder.name
			),
			afterMethod = moduleHelper.getMethodToInvoke(
				currentModule.implementation, 'afterRender', placeholder.name
			);

		// element can declare that before it renders need to scroll top
		if (element.attr(SCROLL_TOP_ATTRIBUTE) &&
			!renderingContext.scrolledTop) {
			this.$(self._window).scrollTop(0);
			renderingContext.scrolledTop = true;
		}

		var eventArgs = {
			name: placeholder.name,
			moduleName: placeholder.moduleName,
			element: element,
			context: currentModule.implementation.$context
		};
		this._eventBus.emit('placeholderRender', eventArgs);

		element.addClass(LOADING_CLASS_NAME);
		var promise;
		try {
			promise = Promise.resolve(renderMethod());
		} catch (e) {
			promise = Promise.reject(e);
		}

		var startTime = Date.now();

		return promise
			.then(function (dataContext) {
				eventArgs.dataContext = dataContext;
				renderingContext.afterMethods.push(
					function () {
						afterMethod(dataContext);
					}
				);
				return self._handleDataContext(
					element, placeholder, dataContext
				)
					.then(function () {
						element.removeClass(LOADING_CLASS_NAME);
						eventArgs.time = Date.now() - startTime;
						self._eventBus.emit('placeholderRendered', eventArgs);
					});
			})
			.then(function () {
				var innerPromises = Object
					.keys(renderingContext.placeholdersByIds)
					.filter(function (id) {
						return (!(id in renderingContext.rendered) &&
							element.find('#' + id).length === 1);
					})
					.map(function (id) {
						return self.renderPlaceholder(
							renderingContext.placeholdersByIds[id],
							parameters, renderingContext
						);
					});

				return Promise.all(innerPromises);
			})
			.then(function () {
				return renderingContext;
			}, function (reason) {
				self._handleRenderingError(
					currentModule, element, parameters, reason
				);
				return renderingContext;
			});
	};

/**
 * Handles data context from render method of module.
 * @param {jQuery} element Element render to.
 * @param {Object} placeholder Placeholder full name.
 * @param {Object} dataContext Data context for template engine.
 * @returns {Promise} Promise for nothing.
 * @private
 */
PageRenderer.prototype._handleDataContext =
	function (element, placeholder, dataContext) {
		var self = this;
		return new placeholder.render(dataContext)
			.then(function (html) {
				if (element[0].tagName === HEAD_ELEMENT_NAME) {
					self._mergeHead(element, html);
				} else {
					element.html(html);
				}
				self._setToLastRendered(placeholder, dataContext);
			});
	};

/**
 * Handles rendering errors.
 * @param {Object} module Module which placeholder is rendering.
 * @param {jQuery} element Rendering element.
 * @param {Object} renderingParameters Rendering parameters.
 * @param {Error} error Rendering error.
 * @private
 */
PageRenderer.prototype._handleRenderingError =
	function (module, element, renderingParameters, error) {
		this._eventBus.emit('error', error);
		element.removeClass(LOADING_CLASS_NAME);

		// do not corrupt existed HEAD when error occours
		if (element[0].tagName === HEAD_ELEMENT_NAME) {
			return;
		}

		if (!this._isRelease && error instanceof Error) {
			element.html(
				errorHelper.prettyPrint(error, renderingParameters.userAgent)
			);
		} else if (module.errorPlaceholder) {
			module.errorPlaceholder.render(error)
				.then(function (html) {
					element.html(html);
				});
		} else {
			element.empty();
		}
	};

/**
 * Gets set of module names which parameters
 * were changed since last rendering process.
 * @param {Object} commonState State map by module names.
 * @returns {Object} Filtered module names.
 * @private
 */
PageRenderer.prototype._getNamesOfChangedModules = function (commonState) {
	// some module's parameters can be removed since last time
	var changed = {};

	Object.keys(this._lastState)
		.filter(function (moduleName) {
			return !(moduleName in commonState);
		})
		.forEach(function (name) {
			changed[name] = true;
		});

	Object.keys(commonState)
		.forEach(function (moduleName) {
			// new parameters were set for module
			if (!(moduleName in this._lastState)) {
				changed[moduleName] = true;
				return;
			}

			// new and last parameters has different values
			var lastParameterNames =
					Object.keys(this._lastState[moduleName]),
				currentParameterNames =
					Object.keys(commonState[moduleName]);

			if (currentParameterNames.length !==
				lastParameterNames.length) {
				changed[moduleName] = true;
				return;
			}

			currentParameterNames.every(function (parameterName) {
				if (commonState[moduleName][parameterName] !==
					this._lastState[moduleName][parameterName]) {
					changed[moduleName] = true;
					return false;
				}
				return true;
			}, this);
		}, this);
	return changed;
};

/**
 * Finds all rendering roots on page for all changed modules.
 * @param {Object} moduleNamesToRender Set of module names that were changed.
 * @returns {Array} Placeholders which are rendering roots.
 * @private
 */
PageRenderer.prototype._findRenderingRoots = function (moduleNamesToRender) {
	var placeholdersByIds = this._moduleLoader.getPlaceholdersByIds(),
		modules = this._moduleLoader.getModulesByNames(),
		self = this,
		processedPlaceholderIds = {},
		roots = [];

	Object.keys(moduleNamesToRender)
		.forEach(function (moduleName) {
			Object.keys(modules[moduleName].placeholders)
				.forEach(function (placeholderName) {
					var current = modules[moduleName]
							.placeholders[placeholderName],
						currentElement = self.$('#' + current.fullName),
						currentId = current.fullName,
						lastRoot = current;

					if (currentId in processedPlaceholderIds) {
						return;
					}
					processedPlaceholderIds[currentId] = true;

					if (currentElement.length !== 1) {
						return;
					}

					while (currentElement[0].tagName !== HTML_ELEMENT_NAME) {
						currentElement = currentElement.parent();
						currentId = currentElement.attr(ID_ATTRIBUTE_NAME);

						if (currentId in processedPlaceholderIds) {
							break;
						}

						// if element is not a placeholder
						if (!(currentId in placeholdersByIds)) {
							continue;
						}
						processedPlaceholderIds[currentId] = true;
						current = placeholdersByIds[currentId];

						// if placeholder`s module did not change state
						if (!(current.moduleName in moduleNamesToRender)) {
							continue;
						}

						lastRoot = current;
					}

					roots.push(lastRoot);
				});
		});

	return roots;
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
			attributes.push(this.nodeName + '=' + this.value);
		});
	return attributes
		.sort()
		.join('|') + content;
};

/**
 * Sets data context to last rendered data storage.
 * @param {Object} placeholder Placeholder object.
 * @param {Object} dataContext Rendering data context.
 * @private
 */
PageRenderer.prototype._setToLastRendered =
	function (placeholder, dataContext) {
		var lastRendered = this._moduleLoader.lastRenderedData;
		if (!(placeholder.moduleName in lastRendered)) {
			lastRendered[placeholder.moduleName] = {};
		}

		lastRendered[placeholder.moduleName][placeholder.name] = dataContext;
	};

/**
 * Run all `after` methods for placeholders that were rendered at server-side.
 * @private
 */
PageRenderer.prototype._runAfterMethodsAndEvents = function () {
	var self = this,
		lastRenderedData = this._moduleLoader.lastRenderedData,
		modules = this._moduleLoader.getModulesByNames();
	Object.keys(lastRenderedData)
		.forEach(function (moduleName) {
			Object.keys(lastRenderedData[moduleName])
				.forEach(function (placeholderName) {
					var placeholder = modules[moduleName]
							.placeholders[placeholderName],
						dataContext = lastRenderedData
							[moduleName][placeholderName],
						eventArgs = {
							name: placeholderName,
							moduleName: moduleName,
							element: self.$('#' + placeholder.fullName),
							dataContext: dataContext,
							context: modules[moduleName]
								.implementation.$context
						};
					self._eventBus.emit('placeholderRendered', eventArgs);
					try {
						var afterMethod = moduleHelper.getMethodToInvoke(
							modules[moduleName].implementation,
							'afterRender', placeholderName
						);
						afterMethod(dataContext);
					} catch (e) {
						self._eventBus.emit('error', e);
					}
				});
		});

	var context = this._contextFactory.create(
		lastRenderedData, this._serviceLocator.resolve('cookiesWrapper'),
		this._lastState, {
			referrer: this._window.document.referrer,
			urlPath: this._window.location.pathname +
				this._window.location.search,
			userAgent: this._window.navigator.userAgent
		}
	);
	self._eventBus.emit('pageRendered', context);
};