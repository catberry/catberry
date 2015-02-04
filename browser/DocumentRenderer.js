/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = DocumentRenderer;

var util = require('util'),
	errorHelper = require('../lib/helpers/errorHelper'),
	moduleHelper = require('../lib/helpers/moduleHelper'),
	DocumentRendererBase = require('../lib/base/DocumentRendererBase');

util.inherits(DocumentRenderer, DocumentRendererBase);

var HEAD_ID = '$$head',
	TAG_NAMES = {
		TITLE: 'TITLE',
		HTML: 'HTML',
		HEAD: 'HEAD',
		BASE: 'BASE',
		STYLE: 'STYLE',
		SCRIPT: 'SCRIPT',
		NOSCRIPT: 'NOSCRIPT',
		META: 'META',
		LINK: 'LINK'
	};

/**
 * Creates new instance of document renderer.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 * @extends DocumentRendererBase
 */
function DocumentRenderer($serviceLocator) {
	DocumentRendererBase.call(this, $serviceLocator);
	this._componentInstances = {};
	this._componentBindings = {};
	this._currentChangedStores = [];
	this._window = $serviceLocator.resolve('window');
	this._config = $serviceLocator.resolve('config');
	this._storeDispatcher = $serviceLocator.resolve('storeDispatcher');

	var self = this;
	this._eventBus.on('storeChanged', function (storeName) {
		if (self._isStateChanging) {
			return;
		}
		self._updateStoreComponents(storeName);
	});
	// need to run all bind methods and events for components
	// have been rendered at server after all modules will be resolved from
	// Service Locator
	setTimeout(function () {
		self._initialWrap();
	}, 0);
}

/**
 * Current application config.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._config = null;

/**
 * Current store dispatcher.
 * @type {StoreDispatcher}
 * @private
 */
DocumentRenderer.prototype._storeDispatcher = null;

/**
 * Current set of component instances by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentInstances = null;

/**
 * Current set of component bindings by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentBindings = null;

/**
 * Current routing context.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._currentRoutingContext = null;

/**
 * Current queue of changed stores.
 * @type {Array}
 * @private
 */
DocumentRenderer.prototype._currentChangedStores = null;

/**
 * Current promise for rendered data.
 * @type {Promise}
 * @private
 */
DocumentRenderer.prototype._renderedPromise = null;

/**
 * Determines the process of changing application state.
 * @type {boolean}
 * @private
 */
DocumentRenderer.prototype._isStateChanging = false;

/**
 * Renders new state of application.
 * @param {Object} state New state of application.
 * @param {Object} routingContext Routing context.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.render = function (state, routingContext) {
	var self = this;
	var renderedPromise = this._getRenderedPromise()
		.then(function () {
			var components = this._componentLoader.getComponentsByNames();
			// we have to update all contexts of all components
			self._currentRoutingContext = routingContext;
			Object.keys(self._componentInstances)
				.forEach(function (id) {
					var instance = self._componentInstances[id];
					instance.$context = self._getComponentContext(
						components[instance.$context.name], instance.$context.element
					);
				});
			// we should set this flag to avoid "storeChanged" event handling for now
			self._isStateChanging = true;
			var changedStores = self._storeDispatcher.setState(state, routingContext);
			self._isStateChanging = false;
			// and then we update all components of these stores in a batch.
			return self._updateStoreComponents(changedStores);
		})
		.then(function () {
			if (self._renderedPromise === renderedPromise) {
				self._renderedPromise = null;
			}
			self._eventBus.emit('pageRendered', self._currentRoutingContext);
		});
	this._renderedPromise = renderedPromise;
	return renderedPromise;
};

/**
 * Renders component into HTML element.
 * @param {Element} element HTML element of component
 * @param {Object?} renderingContext Rendering context for group rendering.
 */
DocumentRenderer.prototype.renderComponent =
	function (element, renderingContext) {
		renderingContext = renderingContext || this._createRenderingContext([]);

		var self = this,
			componentName = moduleHelper.getOriginalComponentName(
					element.tagName
			),
			hadChildren = element.hasChildNodes(),
			component = renderingContext.components[componentName],
			id = getId(element),
			instance = this._componentInstances[id];

		if (!id || renderingContext.renderedIds[id]) {
			return Promise.resolve();
		}

		if (!component) {
			return Promise.resolve();
		}

		if (!instance) {
			instance = this._serviceLocator.resolveInstance(
				component.constructor, renderingContext.config
			);
			instance.$context = this._getComponentContext(component, element);
			this._componentInstances[id] = instance;
		}

		var eventArgs = {
			name: componentName,
			context: instance.$context
		};

		renderingContext.renderedIds[id] = true;
		var startTime = Date.now();
		this._eventBus.emit('componentRender', eventArgs);

		return this._unbindAll(element, renderingContext)
			.catch(function (reason) {
				self._eventBus.emit('error', reason);
			})
			.then(function () {
				var renderMethod = moduleHelper.getMethodToInvoke(
					instance, 'render'
				);
				return moduleHelper.getSafePromise(renderMethod);
			})
			.then(function (dataContext) {
				return component.template.render(dataContext);
			})
			.then(function (html) {
				//TODO optimize append and prepend operations if possible
				if (element.tagName === TAG_NAMES.HEAD) {
					self._mergeHead(element, html);
				} else {
					element.innerHTML = html;
				}
				var promises = self._findComponents(element, renderingContext)
					.map(function (innerComponent) {
						return self.renderComponent(
							innerComponent, renderingContext
						);
					});
				return Promise.all(promises);
			})
			.then(function () {
				eventArgs.time = Date.now() - startTime;
				self._eventBus.emit('componentRendered', eventArgs);
				return self._bindComponent(element);
			})
			.catch(function (reason) {
				return self._handleError(element, component, reason);
			})
			.then(function () {
				if (!hadChildren) {
					return;
				}
				self._collectGarbage(renderingContext);
			});
	};

/**
 * Gets component instance by ID.
 * @param {String} id Component ID.
 * @returns {Object} Component instance.
 */
DocumentRenderer.prototype.getComponentById = function (id) {
	return this._componentInstances[id];
};

/**
 * Clears all references to removed components.
 * @param {Object} renderingContext Context of rendering.
 * @private
 */
DocumentRenderer.prototype._collectGarbage = function (renderingContext) {
	var self = this;
	Object.keys(renderingContext.unboundIds)
		.forEach(function (id) {
			// this component has been rendered again and we do not need to
			// remove it.
			if (renderingContext.renderedIds[id]) {
				return;
			}

			self._componentInstances[id] = null;
			self._componentBindings[id] = null;
		});
};

/**
 * Unbinds all event handlers from every inner component in DOM.
 * @param {Element} element Component HTML element.
 * @param {Object} renderingContext Context of rendering.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._unbindAll = function (element, renderingContext) {
	var self = this,
		rootPromise = this._unbindComponent(element);

	if (!element.hasChildNodes()) {
		return rootPromise;
	}

	return rootPromise
		.then(function () {
			var promises = self._findComponents(element, renderingContext)
				.map(function (innerElement) {
					var id = getId(innerElement);
					renderingContext.unboundIds[id] = true;
					return self._unbindComponent(innerElement);
				});
			return Promise.all(promises);
		});
};

/**
 * Unbinds all event handlers from component.
 * @param {Element} element Component HTML element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._unbindComponent = function (element) {
	var id = getId(element),
		self = this,
		instance = this._componentInstances[id];
	if (!instance) {
		return Promise.resolve();
	}
	if (this._componentBindings[id]) {
		Object.keys(this._componentBindings[id])
			.forEach(function (eventName) {
				element.removeEventListener(
					eventName, self._componentBindings[id].handler, true
				);
			});
		this._componentBindings[id] = null;
	}
	var unbindMethod = moduleHelper.getMethodToInvoke(instance, 'unbind');
	return moduleHelper.getSafePromise(unbindMethod);
};

/**
 * Binds all event handlers from component.
 * @param {Element} element Component HTML element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._bindComponent = function (element) {
	var id = getId(element),
		self = this,
		instance = this._componentInstances[id];
	if (!instance) {
		return Promise.resolve();
	}

	var bindMethod = moduleHelper.getMethodToInvoke(instance, 'bind');
	return moduleHelper.getSafePromise(bindMethod)
		.then(function (bindings) {
			if (!bindings || typeof(bindings) !== 'object') {
				return;
			}
			self._componentBindings[id] = {};
			Object.keys(bindings)
				.forEach(function (eventName) {
					var selectorHandlers = {};
					Object.keys(bindings[eventName])
						.forEach(function (selector) {
							var handler = bindings[eventName][selector];
							if (typeof(handler) !== 'function') {
								return;
							}
							selectorHandlers[selector] = handler.bind(instance);
						});
					self._componentBindings[id][eventName] = {
						handler: self._createBindingHandler(selectorHandlers),
						selectorHandlers: selectorHandlers
					};
					element.addEventListener(
						eventName,
						self._componentBindings[id][eventName].handler, true
					);
				});
		});
};

/**
 * Creates universal event handler for delegated events.
 * @param {Object} selectorHandlers Map of event handlers by CSS selectors.
 * @returns {Function} Universal event handler for delegated events.
 * @private
 */
DocumentRenderer.prototype._createBindingHandler = function (selectorHandlers) {
	var selectors = Object.keys(selectorHandlers);
	return function (event) {
		var element = event.target,
			targetMatches = getMatchesMethod(element),
			isHandled = false;
		selectors.every(function (selector) {
			if (!targetMatches(selector)) {
				return true;
			}
			isHandled = true;
			selectorHandlers[selector](event);
			return false;
		});
		if (isHandled) {
			return;
		}

		while(element.nodeName !== TAG_NAMES.HTML) {
			element = element.parentNode;
			targetMatches = getMatchesMethod(element);
			for (var i = 0; i < selectors.length; i++) {
				if (!targetMatches(selectors[i])) {
					continue;
				}
				isHandled = true;
				selectorHandlers[selectors[i]](event);
				break;
			}

			if (isHandled) {
				break;
			}
		}
	};
};

/**
 * Finds all components that are children of specified element.
 * @param {Element} element Parent element to search.
 * @param {Object} renderingContext Context of rendering.
 * @private
 */
DocumentRenderer.prototype._findComponents =
	function (element, renderingContext) {
		var components = [];
		renderingContext.componentTags
			.forEach(function (tag) {
				components = components.concat(
					element.getElementsByTagName(tag)
				);
			});
		return components;
	};

/**
 * Handles error while rendering.
 * @param {Element} element Component HTML element.
 * @param {Object} component Component instance.
 * @param {Error} error Error to handle.
 * @returns {Promise|null} Promise for nothing or null.
 * @private
 */
DocumentRenderer.prototype._handleError = function (element, component, error) {
	this._eventBus.emit('error', error);

	// do not corrupt existed HEAD when error occurs
	if (element.tagName === TAG_NAMES.HEAD) {
		return null;
	}

	if (!this._config.isRelease && error instanceof Error) {
		element.innerHTML = errorHelper.prettyPrint(
			error, this._window.navigator.userAgent
		);
	} else if (component.errorTemplate) {
		return component.errorTemplate.render(error)
			.then(function (html) {
				element.innerHTML = html;
			});
	} else {
		element.innerHTML = '';
	}

	return null;
};

/**
 * Updates all components that depends on changed stores.
 * @param {Array<String>|String|null} storeNames Names of stores which
 * have been changed.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._updateStoreComponents = function (storeNames) {
	if (storeNames instanceof Array && storeNames.length > 0) {
		this._currentChangedStores = this._currentChangedStores
			.concat(storeNames);
	}
	if (typeof(storeNames) === 'string') {
		this._currentChangedStores.push(storeNames);
	}

	if (this._renderedPromise) {
		return Promise.resolve();
	}

	if (this._currentChangedStores.length === 0) {
		return Promise.resolve();
	}

	var changedStores = this._currentChangedStores;
	this._currentChangedStores = [];

	var self = this,
		renderingContext = this._createRenderingContext(changedStores),
		promises = renderingContext.roots.map(function (root) {
			return self.renderComponent(root, renderingContext);
		});

	return Promise.all(promises)
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			self._isRendering = false;
			return self._updateStoreComponents(null);
		});
};

/**
 * Merges new and existed head elements and change only difference.
 * @param {Element} head HEAD DOM element.
 * @param {string} htmlText HTML of new HEAD element content.
 * @private
 */
/*jshint maxcomplexity:false */
DocumentRenderer.prototype._mergeHead = function (head, htmlText) {
	var self = this,
		newHead = this._window.document.createElement('head');
	newHead.innerHTML = htmlText;

	var map = this._getHeadMap(head.childNodes),
		current, i, key, oldKey, oldItem,
		sameMetaElements = {};

	for (i = 0; i < newHead.childNodes.length; i++) {
		current = newHead.childNodes[i];

		//var wrapped = self.$(this), key, oldKey, oldItem;

		if (!(current.tagName in map)) {
			map[current.tagName] = {};
		}

		switch (this.tagName) {
			// these elements can be only replaced
			case TAG_NAMES.TITLE:
			case TAG_NAMES.BASE:
			case TAG_NAMES.NOSCRIPT:
				key = this._getElementKey(current);
				oldItem = head.getElementsByTagName(current.tagName)[0];
				if (oldItem) {
					oldKey = this._getElementKey(oldItem);
					head.replaceChild(current, oldItem);
				} else {
					head.appendChild(current);
				}
				break;

			// meta elements can be deleted
			// but we should not delete and append same elements
			case TAG_NAMES.META:
				key = self._getElementKey(current);
				if (key in map[current.tagName]) {
					sameMetaElements[key] = true;
				} else {
					head.appendChild(current);
				}
				break;

			// these elements can not be deleted from head
			// therefore we just add new elements that differs from existed
			case TAG_NAMES.STYLE:
			case TAG_NAMES.LINK:
			case TAG_NAMES.SCRIPT:
				key = self._getElementKey(current);
				if (!(key in map[current.tagName])) {
					head.appendChild(current);
				}
				break;
		}
	}

	if (TAG_NAMES.META in map) {
		// remove meta tags which a not in a new head state
		Object.keys(map[TAG_NAMES.META])
			.forEach(function (metaKey) {
				if (metaKey in sameMetaElements) {
					return;
				}

				head.removeChild(map[TAG_NAMES.META][metaKey]);
			});
	}
};

/**
 * Gets map of all HEAD's elements.
 * @param {NodeList} headChildren Head children DOM nodes.
 * @returns {Object} Map of HEAD elements.
 * @private
 */
DocumentRenderer.prototype._getHeadMap = function (headChildren) {
	// Create map of <meta>, <link>, <style> and <script> tags
	// by unique keys that contain attributes and content
	var map = {},
		i, current,
		self = this;

	for (i = 0; i < headChildren.length; i++) {
		current = headChildren[i];
		if (!(current.tagName in map)) {
			map[current.tagName] = {};
		}
		map[current.tagName][self._getElementKey(current)] = current;
	}
	return map;
};

/**
 * Gets unique element key using attributes and its content.
 * @param {Element} element HTML element.
 * @returns {string} Unique key for element.
 * @private
 */
DocumentRenderer.prototype._getElementKey = function (element) {
	var content = element ? element.innerHTML : '',
		current, i,
		attributes = [];

	if (element.hasAttributes()) {
		for (i = 0; i < element.attributes.length; i++) {
			current = element.attributes[i];
			attributes.push(current.name + '=' + current.value);
		}
	}

	return attributes
			.sort()
			.join('|') + content;
};

/**
 * Does initial wrapping for every component.
 * @private
 */
DocumentRenderer.prototype._initialWrap = function () {
	var self = this,
		current, i, id, instance,
		components = this._componentLoader.getComponentsByNames();
	Object.keys(components)
		.forEach(function (componentName) {
			var tagName = moduleHelper
					.getTagNameForComponentName(componentName),
				elements = self._window.document
					.getElementsByTagName(tagName);

			for (i = 0; i < elements.length; i++) {
				current = elements[i];
				id = current.getAttribute(moduleHelper.ATTRIBUTE_ID);
				if (!id) {
					continue;
				}
				instance = self._serviceLocator.resolveInstance(
					components[componentName].constructor, self._config
				);
				instance.$context = self._getComponentContext(
					components[componentName], current
				);
				self._componentInstances[id] = instance;
				self._eventBus.emit('componentRendered', {
					name: componentName,
					attributes: instance.$context.attributes,
					context: instance.$context
				});
			}
		});

	var promises = Object.keys(this._componentInstances)
		.map(function (componentName) {
			var bindMethod = moduleHelper.getMethodToInvoke(
				self._componentInstances[componentName], 'bind'
			);
			var bindPromise;
			try {
				bindPromise = Promise.resolve(bindMethod());
			} catch (e) {
				bindPromise = Promise.reject(e);
			}
			return bindPromise
				.then(function () {
					self._eventBus.emit('componentBound', componentName);
				})
				.catch(function (reason) {
					self._eventBus.emit('error', reason);
				});
		});
	return Promise.all(promises)
		.then(function () {
			self._eventBus.emit('pageRendered', self._currentRoutingContext);
		});
};

/**
 * Gets component context using basic context.
 * @param {Object} component Component details.
 * @param {Element} element DOM element of component.
 * @returns {Object} Component context.
 * @private
 */
DocumentRenderer.prototype._getComponentContext =
	function (component, element) {
		var self = this,
			storeName = element.getAttribute(moduleHelper.ATTRIBUTE_STORE),
			componentContext = Object.create(this._currentRoutingContext);

		componentContext.element = element;
		componentContext.getElementById = function (id) {
			self.getComponentById(id);
		};
		componentContext.name = component.name;
		componentContext.attributes = attributesToObject(element.attributes);
		componentContext.getStoreData = function () {
			return self._renderingContext.storeDispatcher
				.getStoreData(storeName);
		};
		componentContext.sendAction = function (name, args) {
			return self._renderingContext.storeDispatcher
				.sendAction(storeName, name, args);
		};
		componentContext.sendBroadcastAction = function (name, args) {
			return self._renderingContext.storeDispatcher
				.sendBroadcastAction(name, args);
		};

		return componentContext;
	};

/**
 * Finds all rendering roots on page for all changed stores.
 * @param {Array} changedStoreNames List of store names which has been changed.
 * @returns {Array<Element>} HTML elements that are rendering roots.
 * @private
 */
DocumentRenderer.prototype._findRenderingRoots = function (changedStoreNames) {
	var self = this,
		components = {},
		rootsSet = {},
		roots = [];

	Object.keys(changedStoreNames)
		.forEach(function (storeName) {
			components[storeName] = self._window.document.querySelectorAll(
				'[' +
				moduleHelper.ATTRIBUTE_ID +
				']' +
				'[' +
				moduleHelper.ATTRIBUTE_STORE +
				'=' +
				storeName +
				']'
			);
		});
	Object.keys(changedStoreNames)
		.forEach(function (storeName) {
			components[storeName].forEach(function (element) {
				var current = element,
					currentId = element.getAttribute(moduleHelper.ATTRIBUTE_ID),
					lastRoot = current,
					lastRootId = currentId;

				while (current.tagName !== TAG_NAMES.HTML) {
					current = current.parentNode;
					currentId = current.getAttribute(moduleHelper.ATTRIBUTE_ID);

					// is not a component
					if (!(currentId in self._componentInstances)) {
						continue;
					}

					// store did not change state
					if (!(current.getAttribute(moduleHelper.ATTRIBUTE_STORE) in
						changedStoreNames)) {
						continue;
					}

					lastRoot = current;
					lastRootId = currentId;
				}
				if (lastRootId in rootsSet) {
					return;
				}
				rootsSet[lastRootId] = true;
				roots.push(lastRoot);
			});
		});

	return roots;
};

DocumentRenderer.prototype._getRenderedPromise = function () {
	return this._renderedPromise ? this._renderedPromise : Promise.resolve();
};

/**
 * Creates rendering context.
 * @param {Array?} changedStores Names of changed stores.
 * @returns {{
 *   config: Object,
 *   renderedIds: {},
 *   unboundIds: {},
 *   isHeadRendered: Boolean,
 *   bindMethods: Array,
 *   routingContext: Object,
 *   components: Object,
 *   componentTags: Array,
 *   roots: Array.<Element>
 * }}
 * @private
 */
DocumentRenderer.prototype._createRenderingContext = function (changedStores) {
	var components = this._componentLoader.getComponentsByNames(),
		componentTags = Object.keys(components)
			.map(function (name) {
				return moduleHelper.getTagNameForComponentName(name);
			});
	return {
		config: this._config,
		renderedIds: {},
		unboundIds: {},
		isHeadRendered: false,
		bindMethods: [],
		routingContext: this._currentRoutingContext,
		components: components,
		componentTags: componentTags,
		roots: changedStores ? this._findRenderingRoots(changedStores) : []
	};
};

/**
 * Converts NamedNodeMap of Attr items to key-value object map.
 * @param {NamedNodeMap} attributes
 * @returns {Object} Map of attribute values by names.
 */
function attributesToObject(attributes) {
	var result = {};
	for (var i = 0; i < attributes.length; i++) {
		result[attributes[i].name] = attributes[i].value;
	}
	return result;
}

/**
 * Gets ID of the element.
 * @param {Element} element HTML element of component.
 * @returns {string} ID.
 */
function getId(element) {
	return element.tagName === TAG_NAMES.HEAD ?
		HEAD_ID :
		element.getAttribute(moduleHelper.ATTRIBUTE_ID);
}

/**
 * Gets cross-browser "matches" method for the element.
 * @param {Element} element HTML element.
 * @returns {Function} "matches" method.
 */
function getMatchesMethod(element) {
	return (element.matches ||
		element.webkitMatchesSelector ||
		element.mozMatchesSelector ||
		element.oMatchesSelector ||
		element.msMatchesSelector);
}