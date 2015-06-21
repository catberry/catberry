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
	hrTimeHelper = require('../lib/helpers/hrTimeHelper'),
	DocumentRendererBase = require('../lib/base/DocumentRendererBase');

util.inherits(DocumentRenderer, DocumentRendererBase);

var SPECIAL_IDS = {
		$$head: '$$head',
		$$document: '$$document'
	},
	ERROR_CREATE_WRONG_ARGUMENTS = 'Tag name should be a string ' +
		'and attributes should be an object',
	ERROR_CREATE_WRONG_NAME = 'Component for tag "%s" not found',
	ERROR_CREATE_WRONG_ID = 'The ID is not specified or already used',
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
	},
	NODE_TYPES = {
		ELEMENT_NODE: 1,
		TEXT_NODE: 3,
		PROCESSING_INSTRUCTION_NODE: 7,
		COMMENT_NODE: 8
	},
	// http://www.w3.org/TR/2015/WD-uievents-20150319/#event-types-list
	NON_BUBBLING_EVENTS = {
		abort: true,
		blur: true,
		error: true,
		focus: true,
		load: true,
		mouseenter: true,
		mouseleave: true,
		resize: true,
		unload: true
	};

/**
 * Creates new instance of the document renderer.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 * @extends DocumentRendererBase
 */
function DocumentRenderer($serviceLocator) {
	DocumentRendererBase.call(this, $serviceLocator);
	this._componentInstances = Object.create(null);
	this._componentElements = Object.create(null);
	this._componentBindings = Object.create(null);
	this._currentChangedStores = Object.create(null);
	this._window = $serviceLocator.resolve('window');
	this._config = $serviceLocator.resolve('config');
	this._storeDispatcher = $serviceLocator.resolve('storeDispatcher');

	var self = this;

	this._eventBus.on('storeChanged', function (storeName) {
		self._currentChangedStores[storeName] = true;
		if (self._isStateChanging) {
			return;
		}
		self._updateStoreComponents();
	});
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
 * @protected
 */
DocumentRenderer.prototype._storeDispatcher = null;

/**
 * Current set of component instances by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentInstances = null;

/**
 * Current set of component elements by unique keys.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._componentElements = null;

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
 * Current set of changed stores.
 * @type {Object}
 * @private
 */
DocumentRenderer.prototype._currentChangedStores = null;

/**
 * Current promise for rendered page.
 * @type {Promise}
 * @private
 */
DocumentRenderer.prototype._renderedPromise = null;

/**
 * Current state of updating components.
 * @type {boolean}
 * @private
 */
DocumentRenderer.prototype._isUpdating = false;

/**
 * Current awaiting routing.
 * @type {{state: Object, routingContext: Object}}
 * @private
 */
DocumentRenderer.prototype._awaitingRouting = null;

/**
 * Sets the initial state of the application.
 * @param {Object} state New state of application.
 * @param {Object} routingContext Routing context.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.initWithState = function (state, routingContext) {
	var self = this;
	return self._getPromiseForReadyState()
		.then(function () {
			self._currentRoutingContext = routingContext;
			return self._storeDispatcher.setState(state, routingContext);
		})
		.then(function () {
			var components = self._componentLoader.getComponentsByNames(),
				elements = self._findComponents(
					self._window.document.body, components
				);
			elements.unshift(self._window.document.head);
			elements.unshift(self._window.document.documentElement);
			return self._initialWrap(components, elements);

		});
};

/**
 * Renders new state of application.
 * @param {Object} state New state of application.
 * @param {Object} routingContext Routing context.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.render = function (state, routingContext) {
	this._awaitingRouting = {
		state: state,
		routingContext: routingContext
	};
	if (this._isStateChanging) {
		return this._renderedPromise;
	}

	// we should set this flag to avoid "storeChanged"
	// event handling for now
	this._isStateChanging = true;

	var self = this;
	self._renderedPromise = this._getPromiseForReadyState()
		.then(function () {
			// and then we update all components of these stores in a batch.
			return self._updateStoreComponents();
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			self._isStateChanging = false;
		});

	return this._renderedPromise;
};

/**
 * Renders component into HTML element.
 * @param {Element} element HTML element of component
 * @param {Object?} renderingContext Rendering context for group rendering.
 */
DocumentRenderer.prototype.renderComponent =
	function (element, renderingContext) {
		var self = this;
		return this._getPromiseForReadyState()
			.then(function () {
				renderingContext = renderingContext ||
					self._createRenderingContext([]);

				var componentName = moduleHelper.getOriginalComponentName(
						element.tagName
					),
					hadChildren = element.hasChildNodes(),
					component = renderingContext.components[componentName],
					id = self._getId(element),
					instance = self._componentInstances[id];

				if (!component || !id ||
					id in renderingContext.renderedIds) {
					return;
				}

				renderingContext.renderedIds[id] = true;

				if (!renderingContext.startElementId) {
					renderingContext.startElementId = id;
				}

				if (!instance) {
					component.constructor.prototype.$context =
						self._getComponentContext(component, element);
					instance = self._serviceLocator.resolveInstance(
						component.constructor, renderingContext.config
					);
					instance.$context = component.constructor.prototype.$context;
					self._componentInstances[id] = instance;
				}

				var eventArgs = {
					name: componentName,
					context: instance.$context
				};

				self._componentElements[id] = element;

				var startTime = hrTimeHelper.get();
				self._eventBus.emit('componentRender', eventArgs);

				return self._unbindAll(element, renderingContext)
					.catch(function (reason) {
						self._eventBus.emit('error', reason);
					})
					.then(function () {
						if (instance.$context.element !== element) {
							instance.$context = self._getComponentContext(
								component, element
							);
						}
						var renderMethod = moduleHelper.getMethodToInvoke(
							instance, 'render'
						);
						return moduleHelper.getSafePromise(renderMethod);
					})
					.then(function (dataContext) {
						return component.template.render(dataContext);
					})
					.catch(function (reason) {
						return self._handleRenderError(
							element, component, reason
						);
					})
					.then(function (html) {
						if (element.tagName === TAG_NAMES.HEAD) {
							self._mergeHead(element, html);
						} else {
							element.innerHTML = html;
						}
						var promises = self._findComponents(
							element, renderingContext.components
						)
							.map(function (innerComponent) {
								return self.renderComponent(
									innerComponent, renderingContext
								);
							});
						return Promise.all(promises);
					})
					.then(function () {
						eventArgs.hrTime = hrTimeHelper.get(startTime);
						eventArgs.time = eventArgs.hrTime[0];
						self._eventBus.emit('componentRendered', eventArgs);
						return self._bindComponent(element);
					})
					.then(function () {
						// collecting garbage only when
						// the entire rendering is finished
						if (renderingContext.startElementId !== id ||
							!hadChildren) {
							return;
						}
						self._collectRenderingGarbage(renderingContext);
					})
					.catch(function (reason) {
						self._eventBus.emit('error', reason);
					});
			});
	};

/**
 * Gets component instance by ID.
 * @param {String} id Component ID.
 * @returns {Object} Component instance.
 */
DocumentRenderer.prototype.getComponentById = function (id) {
	return this._componentInstances[id] || null;
};

/**
 * Checks that every instance of component has element on the page and
 * removes all references to components removed from DOM.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.collectGarbage = function () {
	var self = this;
	return this._getPromiseForReadyState().
		then(function () {
			var promises = [];
			Object.keys(self._componentElements)
				.forEach(function (id) {
					if (SPECIAL_IDS.hasOwnProperty(id)) {
						return;
					}
					var element = self._window.document.getElementById(id);
					if (element) {
						return;
					}

					var promise = self._unbindComponent(self._componentElements[id])
						.then(function () {
							delete self._componentElements[id];
							delete self._componentInstances[id];
							delete self._componentBindings[id];
						});
					promises.push(promise);
				});
			return Promise.all(promises);
		});
};

/**
 * Creates and renders component element.
 * @param {String} tagName Name of HTML tag.
 * @param {Object} attributes Element attributes.
 * @returns {Promise<Element>} Promise for HTML element with rendered component.
 */
DocumentRenderer.prototype.createComponent = function (tagName, attributes) {
	if (typeof(tagName) !== 'string' || !attributes ||
		typeof(attributes) !== 'object') {
		return Promise.reject(
			new Error(ERROR_CREATE_WRONG_ARGUMENTS)
		);
	}

	var self = this;
	return this._getPromiseForReadyState()
		.then(function () {
			var components = self._componentLoader.getComponentsByNames(),
				componentName = moduleHelper.getOriginalComponentName(tagName);

			if (moduleHelper.isHeadComponent(componentName) ||
				moduleHelper.isDocumentComponent(componentName) ||
				!(componentName in components)) {
				return Promise.reject(
					new Error(util.format(ERROR_CREATE_WRONG_NAME, tagName))
				);
			}

			var safeTagName = moduleHelper.getTagNameForComponentName(componentName);

			var id = attributes[moduleHelper.ATTRIBUTE_ID];
			if (!id || id in self._componentInstances) {
				return Promise.reject(new Error(ERROR_CREATE_WRONG_ID));
			}

			var element = self._window.document.createElement(safeTagName);
			Object.keys(attributes)
				.forEach(function (attributeName) {
					element.setAttribute(attributeName, attributes[attributeName]);
				});

			return self.renderComponent(element)
				.then(function () {
					return element;
				});
		});
};

/**
 * Clears all references to removed components during rendering process.
 * @param {Object} renderingContext Context of rendering.
 * @private
 */
DocumentRenderer.prototype._collectRenderingGarbage =
	function (renderingContext) {
		var self = this;
		Object.keys(renderingContext.unboundIds)
			.forEach(function (id) {
				// this component has been rendered again and we do not need to
				// remove it.
				if (id in renderingContext.renderedIds) {
					return;
				}

				delete self._componentElements[id];
				delete self._componentInstances[id];
				delete self._componentBindings[id];
			});
	};

/**
 * Unbinds all event handlers from specified component and all it's descendants.
 * @param {Element} element Component HTML element.
 * @param {Object} renderingContext Context of rendering.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._unbindAll = function (element, renderingContext) {
	var self = this,
		id = this._getId(element),
		promises = [];

	if (element.hasChildNodes()) {
		self._findComponents(element, renderingContext.components)
			.forEach(function (innerElement) {
				var id = self._getId(innerElement);
				if (id in renderingContext.unboundIds) {
					return;
				}
				renderingContext.unboundIds[id] = true;
				promises.push(self._unbindComponent(innerElement));
			});
	}

	if (!(id in renderingContext.unboundIds)) {
		promises.push(this._unbindComponent(element));
		renderingContext.unboundIds[id] = true;
	}

	return Promise.all(promises);
};

/**
 * Unbinds all event handlers from specified component.
 * @param {Element} element Component HTML element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._unbindComponent = function (element) {
	var id = this._getId(element),
		self = this,
		instance = this._componentInstances[id];
	if (!instance) {
		return Promise.resolve();
	}
	if (id in this._componentBindings) {
		Object.keys(this._componentBindings[id])
			.forEach(function (eventName) {
				element.removeEventListener(
					eventName,
					self._componentBindings[id][eventName].handler,
					NON_BUBBLING_EVENTS.hasOwnProperty(eventName)
				);
			});
		delete this._componentBindings[id];
	}
	var unbindMethod = moduleHelper.getMethodToInvoke(instance, 'unbind');
	return moduleHelper.getSafePromise(unbindMethod)
		.then(function () {
			self._eventBus.emit('componentUnbound', {
				element: element,
				id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
			});
		})
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		});
};

/**
 * Binds all required event handlers to component.
 * @param {Element} element Component HTML element.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._bindComponent = function (element) {
	var id = this._getId(element),
		self = this,
		instance = this._componentInstances[id];
	if (!instance) {
		return Promise.resolve();
	}

	var bindMethod = moduleHelper.getMethodToInvoke(instance, 'bind');
	return moduleHelper.getSafePromise(bindMethod)
		.then(function (bindings) {
			if (!bindings || typeof(bindings) !== 'object') {
				self._eventBus.emit('componentBound', {
					element: element,
					id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
				});
				return;
			}
			self._componentBindings[id] = Object.create(null);
			Object.keys(bindings)
				.forEach(function (eventName) {
					eventName = eventName.toLowerCase();
					if (eventName in self._componentBindings[id]) {
						return;
					}
					var selectorHandlers = Object.create(null);
					Object.keys(bindings[eventName])
						.forEach(function (selector) {
							var handler = bindings[eventName][selector];
							if (typeof(handler) !== 'function') {
								return;
							}
							selectorHandlers[selector] = handler.bind(instance);
						});
					self._componentBindings[id][eventName] = {
						handler: self._createBindingHandler(
							element, selectorHandlers
						),
						selectorHandlers: selectorHandlers
					};
					element.addEventListener(
						eventName,
						self._componentBindings[id][eventName].handler,
						NON_BUBBLING_EVENTS.hasOwnProperty(eventName)
					);
				});
			self._eventBus.emit('componentBound', {
				element: element,
				id: id
			});
		});
};

/**
 * Creates universal event handler for delegated events.
 * @param {Element} componentRoot Root element of component.
 * @param {Object} selectorHandlers Map of event handlers by CSS selectors.
 * @returns {Function} Universal event handler for delegated events.
 * @private
 */
DocumentRenderer.prototype._createBindingHandler =
	function (componentRoot, selectorHandlers) {
		var selectors = Object.keys(selectorHandlers);
		return function (event) {
			var dispatchedEvent = createCustomEvent(event, function () {
					return element;
				}),
				element = event.target,
				targetMatches = getMatchesMethod(element),
				isHandled = selectors.some(function (selector) {
					if (targetMatches(selector)) {
						selectorHandlers[selector](dispatchedEvent);
						return true;
					}
					return false;
				});
			if (isHandled || !event.bubbles) {
				return;
			}

			while(element.parentElement && element !== componentRoot) {
				element = element.parentElement;
				targetMatches = getMatchesMethod(element);
				for (var i = 0; i < selectors.length; i++) {
					if (!targetMatches(selectors[i])) {
						continue;
					}
					isHandled = true;
					selectorHandlers[selectors[i]](dispatchedEvent);
					break;
				}

				if (isHandled) {
					break;
				}
			}
		};
	};

/**
 * Finds all descendant components of specified component element.
 * @param {Element} element Root component HTML element to begin search with.
 * @param {Object} components Map of components by names.
 * @private
 */
DocumentRenderer.prototype._findComponents = function (element, components) {
	var elements = [],
		queue = [element],
		currentNodeName, currentChildren, i;

	while (queue.length > 0) {
		currentChildren = queue.shift().childNodes;
		for (i = 0; i < currentChildren.length; i++) {
			// we need only Element nodes
			if (currentChildren[i].nodeType !== 1) {
				continue;
			}

			queue.push(currentChildren[i]);

			currentNodeName = currentChildren[i].nodeName;
			// and they should be components
			if (!moduleHelper.COMPONENT_PREFIX_REGEXP.test(currentNodeName)) {
				continue;
			}
			if (moduleHelper.getOriginalComponentName(currentNodeName) in
					components) {
				elements.push(currentChildren[i]);
			}
		}
	}

	return elements;
};

/**
 * Handles error while rendering.
 * @param {Element} element Component HTML element.
 * @param {Object} component Component instance.
 * @param {Error} error Error to handle.
 * @returns {Promise<String>} Promise for HTML string.
 * @private
 */
DocumentRenderer.prototype._handleRenderError =
	function (element, component, error) {
		this._eventBus.emit('error', error);

		// do not corrupt existed HEAD when error occurs
		if (element.tagName === TAG_NAMES.HEAD) {
			return Promise.resolve('');
		}

		if (!this._config.isRelease && error instanceof Error) {
			return Promise.resolve(errorHelper.prettyPrint(
				error, this._window.navigator.userAgent
			));
		} else if (component.errorTemplate) {
			return component.errorTemplate.render(error);
		}

		return Promise.resolve('');
	};

/**
 * Updates all components that depend on current set of changed stores.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._updateStoreComponents = function () {
	if (this._isUpdating) {
		return Promise.resolve();
	}

	var self = this;

	// if document component is changed we should reload the page
	var documentStore = this._window.document.documentElement.getAttribute(
		moduleHelper.ATTRIBUTE_STORE
	);
	if (documentStore in this._currentChangedStores) {
		var newLocation = this._currentRoutingContext.location.toString();
		if (newLocation === this._window.location.toString()) {
			this._window.location.reload();
			return Promise.resolve();
		}
		this._window.location.assign(newLocation);
		return Promise.resolve();
	}

	this._isUpdating = true;

	// if we have awaiting routing we should apply state to the stores
	if (this._awaitingRouting) {
		var components = this._componentLoader.getComponentsByNames(),
			changedByState = this._storeDispatcher.setState(
				this._awaitingRouting.state,
				this._awaitingRouting.routingContext
			);

		changedByState.forEach(function (name) {
			self._currentChangedStores[name] = true;
		});

		// we should update contexts of the stores with the new routing context
		this._currentRoutingContext = this._awaitingRouting.routingContext;
		Object.keys(this._componentInstances)
			.forEach(function (id) {
				var instance = self._componentInstances[id];
				instance.$context = self._getComponentContext(
					components[instance.$context.name],
					instance.$context.element
				);
			});
		this._awaitingRouting = null;
	}

	var changedStores = Object.keys(this._currentChangedStores);
	if (changedStores.length === 0) {
		this._isUpdating = false;
		return Promise.resolve();
	}

	this._currentChangedStores = Object.create(null);

	var renderingContext = this._createRenderingContext(changedStores),
		promises = renderingContext.roots.map(function (root) {
			return self.renderComponent(root, renderingContext);
		});

	return Promise.all(promises)
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			self._isUpdating = false;
			self._eventBus.emit('documentUpdated', changedStores);
			return self._updateStoreComponents();
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
	if (!htmlText) {
		return;
	}
	var self = this,
		newHead = this._window.document.createElement('head');
	newHead.innerHTML = htmlText;

	var map = this._getHeadMap(head.childNodes),
		current, i, key, oldKey, oldItem,
		sameMetaElements = Object.create(null);

	for (i = 0; i < newHead.childNodes.length; i++) {
		current = newHead.childNodes[i];

		if (!(current.nodeName in map)) {
			map[current.nodeName] = Object.create(null);
		}

		switch (current.nodeName) {
			// these elements can be only replaced
			case TAG_NAMES.TITLE:
			case TAG_NAMES.BASE:
			case TAG_NAMES.NOSCRIPT:
				key = this._getNodeKey(current);
				oldItem = head.getElementsByTagName(current.nodeName)[0];
				if (oldItem) {
					oldKey = this._getNodeKey(oldItem);
					head.replaceChild(current, oldItem);
				} else {
					head.appendChild(current);
				}
				// when we do replace or append current is removed from newHead
				// therefore we need to decrement index
				i--;
				break;

			// these elements can not be deleted from head
			// therefore we just add new elements that differs from existed
			case TAG_NAMES.STYLE:
			case TAG_NAMES.LINK:
			case TAG_NAMES.SCRIPT:
				key = self._getNodeKey(current);
				if (!(key in map[current.nodeName])) {
					head.appendChild(current);
					i--;
				}
				break;
			// meta and other elements can be deleted
			// but we should not delete and append same elements
			default:
				key = self._getNodeKey(current);
				if (key in map[current.nodeName]) {
					sameMetaElements[key] = true;
				} else {
					head.appendChild(current);
					i--;
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
	var map = Object.create(null),
		i, current,
		self = this;

	for (i = 0; i < headChildren.length; i++) {
		current = headChildren[i];
		if (!(current.nodeName in map)) {
			map[current.nodeName] = Object.create(null);
		}
		map[current.nodeName][self._getNodeKey(current)] = current;
	}
	return map;
};

/**
 * Gets unique element key using element's attributes and its content.
 * @param {Node} node HTML element.
 * @returns {string} Unique key for element.
 * @private
 */
DocumentRenderer.prototype._getNodeKey = function (node) {
	var current, i,
		attributes = [];

	if (node.nodeType !== NODE_TYPES.ELEMENT_NODE) {
		return node.nodeValue || '';
	}

	if (node.hasAttributes()) {
		for (i = 0; i < node.attributes.length; i++) {
			current = node.attributes[i];
			attributes.push(current.name + '=' + current.value);
		}
	}

	return attributes
			.sort()
			.join('|') + '>' + node.textContent;
};

/**
 * Does initial wrapping for every component on the page.
 * @private
 */
DocumentRenderer.prototype._initialWrap = function (components, elements) {
	var self = this,
		current = elements.pop();

	return Promise.resolve()
		.then(function () {
			var id = self._getId(current);
			if (!id) {
				return;
			}

			var componentName = moduleHelper.getOriginalComponentName(
					current.nodeName
				);
			if (!(componentName in components)) {
				return;
			}
			var constructor = components[componentName].constructor;
			constructor.prototype.$context = self._getComponentContext(
				components[componentName], current
			);

			var instance = self._serviceLocator.resolveInstance(
				constructor, self._config
			);
			instance.$context = constructor.prototype.$context;
			self._componentElements[id] = current;
			self._componentInstances[id] = instance;
			// initialize the store of the component
			self._storeDispatcher.getStore(
				current.getAttribute(moduleHelper.ATTRIBUTE_STORE)
			);
			self._eventBus.emit('componentRendered', {
				name: componentName,
				attributes: instance.$context.attributes,
				context: instance.$context
			});
			return self._bindComponent(current);
		})
		.then(function () {
			if (elements.length > 0) {
				return self._initialWrap(components, elements);
			}

			self._eventBus.emit(
				'documentRendered', self._currentRoutingContext
			);
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

		// initialize the store of the component
		this._storeDispatcher.getStore(storeName);

		Object.defineProperties(componentContext, {
			element: {
				value: element,
				enumerable: true
			},
			name: {
				get: function () {
					return component.name;
				},
				enumerable: true
			},
			attributes: {
				get: function () {
					return attributesToObject(element.attributes);
				},
				enumerable: true
			},
			getComponentById: {
				value: function (id) {
					return self.getComponentById(id);
				}
			},
			createComponent: {
				value: function (tagName, attributes) {
					return self.createComponent(tagName, attributes);
				}
			},
			collectGarbage: {
				value: function () {
					return self.collectGarbage();
				}
			},
			getStoreData: {
				value: function () {
					var currentStoreName = componentContext.element
						.getAttribute(moduleHelper.ATTRIBUTE_STORE);
					return self._storeDispatcher
						.getStoreData(currentStoreName);
				}
			},
			sendAction: {
				value: function (name, args) {
					var currentStoreName = componentContext.element
						.getAttribute(moduleHelper.ATTRIBUTE_STORE);
					return self._storeDispatcher
						.sendAction(currentStoreName, name, args);
				}
			},
			sendBroadcastAction: {
				value: function (name, args) {
					return self._storeDispatcher
						.sendBroadcastAction(name, args);
				}
			}
		});

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
		headStore = this._window.document.head.getAttribute(
			moduleHelper.ATTRIBUTE_STORE
		),
		components = this._componentLoader.getComponentsByNames(),
		componentsElements = Object.create(null),
		storeNamesSet = Object.create(null),
		rootsSet = Object.create(null),
		roots = [];

	// we should find all components and then looking for roots
	changedStoreNames
		.forEach(function (storeName) {
			storeNamesSet[storeName] = true;
			componentsElements[storeName] = self._window.document
				.querySelectorAll(
					'[' +
					moduleHelper.ATTRIBUTE_ID +
					']' +
					'[' +
					moduleHelper.ATTRIBUTE_STORE +
					'="' +
					storeName +
					'"]'
				);
		});

	if (moduleHelper.HEAD_COMPONENT_NAME in components &&
		headStore in storeNamesSet) {
		rootsSet[this._getId(this._window.document.head)] = true;
		roots.push(this._window.document.head);
	}

	changedStoreNames
		.forEach(function (storeName) {
			var current, currentId,
				lastRoot, lastRootId,
				currentStore, currentComponentName;

			for (var i = 0; i < componentsElements[storeName].length; i++) {
				current = componentsElements[storeName][i];
				currentId = componentsElements[storeName][i]
					.getAttribute(moduleHelper.ATTRIBUTE_ID);
				lastRoot = current;
				lastRootId = currentId;
				currentComponentName = moduleHelper.getOriginalComponentName(
					current.tagName
				);

				while (current.parentElement) {
					current = current.parentElement;
					currentId = self._getId(current);
					currentStore = current.getAttribute(
						moduleHelper.ATTRIBUTE_STORE
					);

					// store did not change state
					if (!currentStore || !(currentStore in storeNamesSet)) {
						continue;
					}

					//// is not an active component
					if (!(currentComponentName in components)) {
						continue;
					}

					lastRoot = current;
					lastRootId = currentId;
				}
				if (lastRootId in rootsSet) {
					continue;
				}
				rootsSet[lastRootId] = true;
				roots.push(lastRoot);
			}
		});

	return roots;
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
 *   roots: Array.<Element>
 * }}
 * @private
 */
DocumentRenderer.prototype._createRenderingContext = function (changedStores) {
	var components = this._componentLoader.getComponentsByNames();

	return {
		config: this._config,
		renderedIds: Object.create(null),
		unboundIds: Object.create(null),
		isHeadRendered: false,
		bindMethods: [],
		routingContext: this._currentRoutingContext,
		components: components,
		roots: changedStores ? this._findRenderingRoots(changedStores) : []
	};
};

/**
 * Gets ID of the element.
 * @param {Element} element HTML element of component.
 * @returns {string} ID.
 */
DocumentRenderer.prototype._getId = function (element) {
	if (element === this._window.document.documentElement) {
		return SPECIAL_IDS.$$document;
	}
	if (element === this._window.document.head) {
		return SPECIAL_IDS.$$head;
	}
	return element.getAttribute(moduleHelper.ATTRIBUTE_ID);
};

/**
 * Converts NamedNodeMap of Attr items to key-value object map.
 * @param {NamedNodeMap} attributes List of Element attributes.
 * @returns {Object} Map of attribute values by names.
 */
function attributesToObject(attributes) {
	var result = Object.create(null);
	for (var i = 0; i < attributes.length; i++) {
		result[attributes[i].name] = attributes[i].value;
	}
	return result;
}

/**
 * Gets cross-browser "matches" method for the element.
 * @param {Element} element HTML element.
 * @returns {Function} "matches" method.
 */
function getMatchesMethod(element) {
	var method =  (element.matches ||
		element.webkitMatchesSelector ||
		element.mozMatchesSelector ||
		element.oMatchesSelector ||
		element.msMatchesSelector);

	return method.bind(element);
}

/**
 * Creates imitation of original Event object but with specified currentTarget.
 * @param {Event} event Original event object.
 * @param {Function} currentTargetGetter Getter for currentTarget.
 * @returns {Event} Wrapped event.
 */
function createCustomEvent(event, currentTargetGetter) {
	var catEvent = Object.create(event),
		keys = [],
		properties = {};
	for(var key in event) {
		keys.push(key);
	}
	keys.forEach(function (key) {
		if (typeof(event[key]) === 'function') {
			properties[key] = {
				get: function () {
					return event[key].bind(event);
				}
			};
			return;
		}

		properties[key] = {
			get: function () {
				return event[key];
			},
			set: function (value) {
				event[key] = value;
			}
		};
	});

	properties.currentTarget = {
		get: currentTargetGetter
	};
	Object.defineProperties(catEvent, properties);
	Object.seal(catEvent);
	Object.freeze(catEvent);
	return catEvent;
}