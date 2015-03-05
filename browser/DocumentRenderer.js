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
	};

/**
 * Creates new instance of the document renderer.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @constructor
 * @extends DocumentRendererBase
 */
function DocumentRenderer($serviceLocator) {
	DocumentRendererBase.call(this, $serviceLocator);
	this._componentInstances = {};
	this._componentElements = {};
	this._componentBindings = {};
	this._currentChangedStores = {};
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
 * Renders new state of application.
 * @param {Object} state New state of application.
 * @param {Object} routingContext Routing context.
 * @returns {Promise} Promise for nothing.
 */
DocumentRenderer.prototype.render = function (state, routingContext) {
	var self = this,
		components = this._componentLoader.getComponentsByNames();
	// we have to update all contexts of all components
	this._currentRoutingContext = routingContext;
	Object.keys(this._componentInstances)
		.forEach(function (id) {
			var instance = self._componentInstances[id];
			instance.$context = self._getComponentContext(
				components[instance.$context.name],
				instance.$context.element
			);
		});

	if (this._isStateChanging) {
		var changedAgain = this._storeDispatcher.setState(
			state, routingContext
		);
		changedAgain.forEach(function (name) {
			self._currentChangedStores[name] = true;
		});
		return this._renderedPromise;
	}

	// we should set this flag to avoid "storeChanged"
	// event handling for now
	this._isStateChanging = true;
	this._storeDispatcher.setState(state, routingContext);

	// and then we update all components of these stores in a batch.
	this._renderedPromise = self._updateStoreComponents()
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
		renderingContext = renderingContext || this._createRenderingContext([]);

		var self = this,
			componentName = moduleHelper.getOriginalComponentName(
					element.tagName
			),
			hadChildren = element.hasChildNodes(),
			component = renderingContext.components[componentName],
			id = this._getId(element),
			instance = this._componentInstances[id];

		if (!component) {
			return Promise.resolve();
		}

		if (!id || renderingContext.renderedIds.hasOwnProperty(id)) {
			return Promise.resolve();
		}

		renderingContext.renderedIds[id] = true;

		if (!instance) {
			component.constructor.prototype.$context =
				this._getComponentContext(component, element);
			instance = this._serviceLocator.resolveInstance(
				component.constructor, renderingContext.config
			);
			instance.$context = component.constructor.prototype.$context;
			this._componentInstances[id] = instance;
		}

		var eventArgs = {
			name: componentName,
			context: instance.$context
		};

		this._componentElements[id] = element;

		var startTime = Date.now();
		this._eventBus.emit('componentRender', eventArgs);

		return this._unbindAll(element, renderingContext)
			.catch(function (reason) {
				self._eventBus.emit('error', reason);
			})
			.then(function () {
				instance.$context.attributes = attributesToObject(
					element.attributes
				);
				var renderMethod = moduleHelper.getMethodToInvoke(
					instance, 'render'
				);
				return moduleHelper.getSafePromise(renderMethod);
			})
			.then(function (dataContext) {
				return component.template.render(dataContext);
			})
			.then(function (html) {
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
				self._collectRenderingGarbage(renderingContext);
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
	var self = this,
		promises = [];
	Object.keys(this._componentElements)
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

	var components = this._componentLoader.getComponentsByNames(),
		componentName = moduleHelper.getOriginalComponentName(tagName);
	if (moduleHelper.isHeadComponent(componentName) ||
		moduleHelper.isDocumentComponent(componentName) ||
		!components.hasOwnProperty(componentName)) {
		return Promise.reject(
			new Error(util.format(ERROR_CREATE_WRONG_NAME, tagName))
		);
	}

	var safeTagName = moduleHelper.getTagNameForComponentName(componentName);

	var id = attributes[moduleHelper.ATTRIBUTE_ID];
	if (!id || this._componentInstances.hasOwnProperty(id)) {
		return Promise.reject(new Error(ERROR_CREATE_WRONG_ID));
	}

	var element = this._window.document.createElement(safeTagName);
	Object.keys(attributes)
		.forEach(function (attributeName) {
			element.setAttribute(attributeName, attributes[attributeName]);
		});

	return this.renderComponent(element)
		.then(function () {
			return element;
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
				if (renderingContext.renderedIds.hasOwnProperty(id)) {
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
		self._findComponents(element, renderingContext)
			.forEach(function (innerElement) {
				var id = self._getId(innerElement);
				if (renderingContext.unboundIds.hasOwnProperty(id)) {
					return;
				}
				renderingContext.unboundIds[id] = true;
				promises.push(self._unbindComponent(innerElement));
			});
	}

	if (!renderingContext.unboundIds.hasOwnProperty(id)) {
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
	if (this._componentBindings.hasOwnProperty(id)) {
		Object.keys(this._componentBindings[id])
			.forEach(function (eventName) {
				element.removeEventListener(
					eventName, self._componentBindings[id][eventName].handler
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
						handler: self._createBindingHandler(
							element, selectorHandlers
						),
						selectorHandlers: selectorHandlers
					};
					element.addEventListener(
						eventName,
						self._componentBindings[id][eventName].handler
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
				isHandled = false;
			selectors.every(function (selector) {
				if (!targetMatches(selector)) {
					return true;
				}
				isHandled = true;
				selectorHandlers[selector](dispatchedEvent);
				return false;
			});
			if (isHandled) {
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
 * @param {Object} renderingContext Context of rendering.
 * @private
 */
DocumentRenderer.prototype._findComponents =
	function (element, renderingContext) {
		var components = [];
		renderingContext.componentTags
			.forEach(function (tag) {
				var nodes = element.getElementsByTagName(tag);
				for(var i = 0; i < nodes.length; i++) {
					components.push(nodes[i]);
				}
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
 * Updates all components that depend on current set of changed stores.
 * @returns {Promise} Promise for nothing.
 * @private
 */
DocumentRenderer.prototype._updateStoreComponents = function () {
	if (this._isUpdating) {
		return Promise.resolve();
	}
	var documentStore = this._window.document.documentElement.getAttribute(
		moduleHelper.ATTRIBUTE_STORE
	);
	if (this._currentChangedStores.hasOwnProperty(documentStore)) {
		var newLocation = this._currentRoutingContext.location.toString();
		if (newLocation === this._window.location.toString()) {
			this._window.location.reload();
			return Promise.resolve();
		}
		this._window.location.assign(newLocation);
		return Promise.resolve();
	}
	var changed = Object.keys(this._currentChangedStores);
	if (changed.length === 0) {
		return Promise.resolve();
	}
	this._currentChangedStores = {};
	var self = this,
		renderingContext = this._createRenderingContext(changed),
		promises = renderingContext.roots.map(function (root) {
			return self.renderComponent(root, renderingContext);
		});

	this._isUpdating = true;
	return Promise.all(promises)
		.catch(function (reason) {
			self._eventBus.emit('error', reason);
		})
		.then(function () {
			self._isUpdating = false;
			self._eventBus.emit('documentUpdated', changed);
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
	var self = this,
		newHead = this._window.document.createElement('head');
	newHead.innerHTML = htmlText;

	var map = this._getHeadMap(head.childNodes),
		current, i, key, oldKey, oldItem,
		sameMetaElements = {};

	for (i = 0; i < newHead.childNodes.length; i++) {
		current = newHead.childNodes[i];

		if (!map.hasOwnProperty(current.nodeName)) {
			map[current.nodeName] = {};
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
				if (!map[current.nodeName].hasOwnProperty(key)) {
					head.appendChild(current);
					i--;
				}
				break;
			// meta and other elements can be deleted
			// but we should not delete and append same elements
			default:
				key = self._getNodeKey(current);
				if (map[current.nodeName].hasOwnProperty(key)) {
					sameMetaElements[key] = true;
				} else {
					head.appendChild(current);
					i--;
				}
				break;
		}
	}

	if (map.hasOwnProperty(TAG_NAMES.META)) {
		// remove meta tags which a not in a new head state
		Object.keys(map[TAG_NAMES.META])
			.forEach(function (metaKey) {
				if (sameMetaElements.hasOwnProperty(metaKey)) {
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
		if (!map.hasOwnProperty(current.nodeName)) {
			map[current.nodeName] = {};
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
DocumentRenderer.prototype._initialWrap = function () {
	var self = this,
		current, i, id, instance,
		components = this._componentLoader.getComponentsByNames(),
		bindPromises = [];

	Object.keys(components)
		.forEach(function (componentName) {
			var tagName = moduleHelper
					.getTagNameForComponentName(componentName),
				elements,
				constructor = components[componentName].constructor;

			if (moduleHelper.isDocumentComponent(componentName)) {
				elements = [self._window.document.documentElement];
			} else if (moduleHelper.isHeadComponent(componentName)) {
				elements = [self._window.document.head];
			} else {
				elements = self._window.document.getElementsByTagName(tagName);
			}

			for (i = 0; i < elements.length; i++) {
				current = elements[i];
				id = self._getId(current);
				if (!id) {
					continue;
				}

				constructor.prototype.$context = self._getComponentContext(
					components[componentName], current
				);
				instance = self._serviceLocator.resolveInstance(
					constructor, self._config
				);
				instance.$context = constructor.prototype.$context;
				self._componentElements[id] = current;
				self._componentInstances[id] = instance;
				self._eventBus.emit('componentRendered', {
					name: componentName,
					attributes: instance.$context.attributes,
					context: instance.$context
				});
				bindPromises.push(self._bindComponent(current));
			}
		});

	return Promise.all(bindPromises)
		.then(function () {
			self._eventBus.emit('documentRendered', self._currentRoutingContext);
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
		componentContext.name = component.name;
		componentContext.attributes = attributesToObject(element.attributes);
		componentContext.getComponentById = function (id) {
			return self.getComponentById(id);
		};
		componentContext.createComponent = function (tagName, attributes) {
			return self.createComponent(tagName, attributes);
		};
		componentContext.collectGarbage = function () {
			return self.collectGarbage();
		};
		componentContext.getStoreData = function () {
			return self._storeDispatcher
				.getStoreData(storeName);
		};
		componentContext.sendAction = function (name, args) {
			return self._storeDispatcher
				.sendAction(storeName, name, args);
		};
		componentContext.sendBroadcastAction = function (name, args) {
			return self._storeDispatcher
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
		headStore = this._window.document.head.getAttribute(
			moduleHelper.ATTRIBUTE_STORE
		),
		components = this._componentLoader.getComponentsByNames(),
		componentsElements = {},
		storeNamesSet = {},
		rootsSet = {},
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

	if (components.hasOwnProperty(moduleHelper.HEAD_COMPONENT_NAME) &&
		storeNamesSet.hasOwnProperty(headStore)) {
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
					if (!currentStore ||
						!storeNamesSet.hasOwnProperty(currentStore)) {
						continue;
					}

					//// is not an active component
					if (!components.hasOwnProperty(currentComponentName)) {
						continue;
					}

					lastRoot = current;
					lastRootId = currentId;
				}
				if (rootsSet.hasOwnProperty(lastRootId)) {
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
	var result = {};
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