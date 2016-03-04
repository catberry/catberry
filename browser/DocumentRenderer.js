'use strict';

const morphdom = require('morphdom');
const errorHelper = require('../lib/helpers/errorHelper');
const moduleHelper = require('../lib/helpers/moduleHelper');
const hrTimeHelper = require('../lib/helpers/hrTimeHelper');
const DocumentRendererBase = require('../lib/base/DocumentRendererBase');

const SPECIAL_IDS = {
	$$head: '$$head',
	$$document: '$$document'
};
const TAG_NAMES = {
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
const NODE_TYPES = {
	ELEMENT_NODE: 1,
	TEXT_NODE: 3,
	PROCESSING_INSTRUCTION_NODE: 7,
	COMMENT_NODE: 8
};

// http://www.w3.org/TR/2015/WD-uievents-20150319/#event-types-list
const NON_BUBBLING_EVENTS = {
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

class DocumentRenderer extends DocumentRendererBase {

	/**
	 * Creates a new instance of the document renderer.
	 * @param {ServiceLocator} locator Locator for resolving dependencies.
	 */
	constructor(locator) {
		super(locator);

		/**
		 * Current set of component instances by unique keys.
		 * @type {Object}
		 * @private
		 */
		this._componentInstances = Object.create(null);

		/**
		 * Current set of component elements by unique keys.
		 * @type {Object}
		 * @private
		 */
		this._componentElements = Object.create(null);

		/**
		 * Current set of component bindings by unique keys.
		 * @type {Object}
		 * @private
		 */
		this._componentBindings = Object.create(null);

		/**
		 * Current set of changed stores.
		 * @type {Object}
		 * @private
		 */
		this._currentChangedStores = Object.create(null);

		this._window = locator.resolve('window');

		/**
		 * Current logger.
		 * @type {Logger}
		 * @private
		 */
		this._logger = locator.resolve('logger');

		/**
		 * Current application config.
		 * @type {Object}
		 * @private
		 */
		this._config = locator.resolve('config');

		/**
		 * Current store dispatcher.
		 * @type {StoreDispatcher}
		 * @protected
		 */
		this._storeDispatcher = locator.resolve('storeDispatcher');

		/**
		 * Current promise for rendered page.
		 * @type {Promise}
		 * @private
		 */
		this._renderedPromise = null;

		/**
		 * Current state of updating components.
		 * @type {boolean}
		 * @private
		 */
		this._isUpdating = false;

		/**
		 * Current awaiting routing.
		 * @type {{state: Object, routingContext: Object}}
		 * @private
		 */
		this._awaitingRouting = null;

		/**
		 * Current routing context.
		 * @type {Object}
		 * @private
		 */
		this._currentRoutingContext = null;

		this._eventBus.on('storeChanged', storeName => {
			this._currentChangedStores[storeName] = true;
			if (this._isStateChanging) {
				return;
			}
			this._updateStoreComponents();
		});
	}

	/**
	 * Sets the initial state of the application.
	 * @param {Object} state New state of the application.
	 * @param {Object} routingContext Routing context.
	 * @returns {Promise} Promise for nothing.
	 */
	initWithState(state, routingContext) {
		return this._getPromiseForReadyState()
			.then(() => {
				this._currentRoutingContext = routingContext;
				return this._storeDispatcher.setState(state, routingContext);
			})
			.then(() => {
				const components = this._componentLoader.getComponentsByNames();
				const elements = this._findComponentElements(
					this._window.document.documentElement, components, true
				);
				elements.unshift(this._window.document.head);
				elements.unshift(this._window.document.documentElement);
				return this._initialWrap(components, elements);
			});
	}

	/**
	 * Renders a new state of the application.
	 * @param {Object} state New state of the application.
	 * @param {Object} routingContext Routing context.
	 * @returns {Promise} Promise for nothing.
	 */
	render(state, routingContext) {
		this._awaitingRouting = {
			state,
			routingContext
		};
		if (this._isStateChanging) {
			return this._renderedPromise;
		}

		// we should set this flag to avoid "storeChanged"
		// event handling for now
		this._isStateChanging = true;

		this._renderedPromise = this._getPromiseForReadyState()
			// and then we update all components of these stores in a batch.
			.then(() => this._updateStoreComponents())
			.catch(reason => this._eventBus.emit('error', reason))
			.then(() => {
				this._isStateChanging = false;
			});

		return this._renderedPromise;
	}

	/**
	 * Renders a component into the HTML element.
	 * @param {Element} element HTML element of the component.
	 * @param {Object?} renderingContext Rendering context for group rendering.
	 */
	renderComponent(element, renderingContext) {

		return this._getPromiseForReadyState()
			.then(() => {
				const id = this._getId(element);
				const componentName = moduleHelper.getOriginalComponentName(element.tagName);

				if (!id) {
					this._logger.warn(`Component "${componentName}" does not have an ID, skipping...`);
					return null;
				}

				if (!renderingContext) {
					renderingContext = this._createRenderingContext([]);
					renderingContext.rootIds[id] = true;
				}

				const hadChildren = element.hasChildNodes();
				const component = renderingContext.components[componentName];
				if (!component) {
					return null;
				}

				if (id in renderingContext.renderedIds) {
					this._logger.warn(
						`The duplicated ID "${id}" has been found, skipping component "${componentName}"...`
					);
					return null;
				}

				renderingContext.renderedIds[id] = true;

				var instance = this._componentInstances[id];
				if (!instance) {
					component.constructor.prototype.$context =
						this._getComponentContext(component, element);
					instance = new component.constructor(this._serviceLocator);
					instance.$context = component.constructor.prototype.$context;
					this._componentInstances[id] = instance;
				}

				const eventArgs = {
					name: componentName,
					context: instance.$context
				};

				this._componentElements[id] = element;

				const startTime = hrTimeHelper.get();
				this._eventBus.emit('componentRender', eventArgs);

				return Promise.resolve()
					.then(() => {
						// we need unbind the whole hierarchy only at
						// the beginning and not for new elements
						if (!(id in renderingContext.rootIds) || !hadChildren) {
							return [];
						}

						return this._unbindAll(element, renderingContext);
					})
					.catch(reason => this._eventBus.emit('error', reason))
					.then(() => {
						if (instance.$context.element !== element) {
							instance.$context = this._getComponentContext(component, element);
						}
						const renderMethod = moduleHelper.getMethodToInvoke(instance, 'render');
						return moduleHelper.getSafePromise(renderMethod);
					})
					.then(dataContext => component.template.render(dataContext))
					.catch(reason => this._handleRenderError(element, component, reason))
					.then(html => {
						const isHead = element.tagName === TAG_NAMES.HEAD;
						if (html === '' && isHead) {
							return [];
						}

						const tmpElement = this._createTemporaryElement(element);
						tmpElement.innerHTML = html;

						if (isHead) {
							this._mergeHead(element, tmpElement);
							return [];
						}

						morphdom(element, tmpElement, {
							onBeforeMorphElChildren: foundElement =>
								foundElement === element || !this._isComponent(
									renderingContext.components, foundElement
								)
						});

						const promises = this._findComponentElements(
							element, renderingContext.components, false
						)
							.map(child => this.renderComponent(child, renderingContext));

						return Promise.all(promises);
					})
					.then(() => {
						eventArgs.hrTime = hrTimeHelper.get(startTime);
						eventArgs.time = hrTimeHelper.toMilliseconds(eventArgs.hrTime);
						this._eventBus.emit('componentRendered', eventArgs);
						return this._bindComponent(element);
					})
					.then(() => {
						// collecting garbage only when
						// the entire rendering is finished
						if (!(id in renderingContext.rootIds) || !hadChildren) {
							return;
						}
						this._collectRenderingGarbage(renderingContext);
					})
					.catch(reason => this._eventBus.emit('error', reason));
			});
	}

	/**
	 * Gets a component instance by ID.
	 * @param {string} id Component ID.
	 * @returns {Object|null} Component instance.
	 */
	getComponentById(id) {
		return this._componentInstances[id] || null;
	}

	/**
	 * Gets component instance by a DOM element.
	 * @param {Element} element Component's Element.
	 * @returns {Object|null} Component instance.
	 */
	getComponentByElement(element) {
		if (!element) {
			return null;
		}
		const id = this._getId(element);
		return this.getComponentById(id);
	}

	/**
	 * Checks that every instance of the component has an element on the page and
	 * removes all references to those components which were removed from DOM.
	 * @returns {Promise} Promise for nothing.
	 */
	/* eslint max-nested-callbacks: 0 */
	collectGarbage() {
		return this._getPromiseForReadyState()
			.then(() => {
				const promises = [];
				Object.keys(this._componentElements)
					.forEach(id => {
						if (SPECIAL_IDS.hasOwnProperty(id)) {
							return;
						}
						const element = this._window.document.getElementById(id);
						if (element) {
							return;
						}

						const promise = this._unbindComponent(this._componentElements[id])
							.then(() => this._removeComponent(id));
						promises.push(promise);
					});
				return Promise.all(promises);
			});
	}

	/**
	 * Creates and renders a component element.
	 * @param {string} tagName Name of the HTML tag.
	 * @param {Object} attributes Element attributes.
	 * @returns {Promise<Element>} Promise for HTML element with the rendered component.
	 */
	createComponent(tagName, attributes) {
		if (typeof (tagName) !== 'string' || !attributes ||
			typeof (attributes) !== 'object') {
			return Promise.reject(
				new Error('Tag name should be a string and attributes should be an object')
			);
		}

		return this._getPromiseForReadyState()
			.then(() => {
				const components = this._componentLoader.getComponentsByNames();
				const componentName = moduleHelper.getOriginalComponentName(tagName);

				if (moduleHelper.isHeadComponent(componentName) ||
					moduleHelper.isDocumentComponent(componentName) ||
					!(componentName in components)) {
					return Promise.reject(new Error(`Component for tag "${tagName}" not found`));
				}

				const safeTagName = moduleHelper.getTagNameForComponentName(componentName);

				const id = attributes[moduleHelper.ATTRIBUTE_ID];
				if (!id || id in this._componentInstances) {
					return Promise.reject(new Error('The ID is not specified or already used'));
				}

				const element = this._window.document.createElement(safeTagName);
				Object.keys(attributes)
					.forEach(attributeName => {
						element.setAttribute(attributeName, attributes[attributeName]);
					});

				return this.renderComponent(element)
					.then(() => element);
			});
	}

	/**
	 * Clears all references to removed components during the rendering process.
	 * @param {Object} renderingContext Context of rendering.
	 * @private
	 */
	_collectRenderingGarbage(renderingContext) {
		Object.keys(renderingContext.unboundIds)
			.forEach(id => {
				// this component has been rendered again and we do not need to
				// remove it.
				if (id in renderingContext.renderedIds) {
					return;
				}

				// if someone added an element with the same ID during the
				// rendering process
				if (this._window.document.getElementById(id) !== null) {
					return;
				}

				this._removeComponent(id);
			});
	}

	/**
	 * Unbinds all event handlers from the specified component and all it's descendants.
	 * @param {Element} element Component HTML element.
	 * @param {Object} renderingContext Context of rendering.
	 * @returns {Promise} Promise for nothing.
	 * @private
	 */
	_unbindAll(element, renderingContext) {
		const rootId = this._getId(element);
		const promises = [];

		this._findComponentElements(element, renderingContext.components, true)
			.forEach(innerElement => {
				const id = this._getId(innerElement);
				renderingContext.unboundIds[id] = true;
				promises.push(this._unbindComponent(innerElement));
			});

		renderingContext.unboundIds[rootId] = true;
		promises.push(this._unbindComponent(element));

		return Promise.all(promises);
	}

	/**
	 * Unbinds all event handlers from the specified component.
	 * @param {Element} element Component HTML element.
	 * @returns {Promise} Promise for nothing.
	 * @private
	 */
	_unbindComponent(element) {
		const id = this._getId(element);
		const instance = this._componentInstances[id];

		if (!instance) {
			return Promise.resolve();
		}
		if (id in this._componentBindings) {
			Object.keys(this._componentBindings[id])
				.forEach(eventName => {
					element.removeEventListener(
						eventName,
						this._componentBindings[id][eventName].handler,
						NON_BUBBLING_EVENTS.hasOwnProperty(eventName)
					);
				});
			delete this._componentBindings[id];
		}

		const unbindMethod = moduleHelper.getMethodToInvoke(instance, 'unbind');
		return moduleHelper.getSafePromise(unbindMethod)
			.then(() => {
				this._eventBus.emit('componentUnbound', {
					element,
					id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
				});
			})
			.catch(reason => this._eventBus.emit('error', reason));
	}

	/**
	 * Removes a component from the current list.
	 * @param {string} id Component's ID
	 * @private
	 */
	_removeComponent(id) {
		delete this._componentElements[id];
		delete this._componentInstances[id];
		delete this._componentBindings[id];
	}

	/**
	 * Binds all required event handlers to the component.
	 * @param {Element} element Component's HTML element.
	 * @returns {Promise} Promise for nothing.
	 * @private
	 */
	_bindComponent(element) {
		const id = this._getId(element);
		const instance = this._componentInstances[id];
		if (!instance) {
			return Promise.resolve();
		}

		const bindMethod = moduleHelper.getMethodToInvoke(instance, 'bind');
		return moduleHelper.getSafePromise(bindMethod)
			.then(bindings => {
				if (!bindings || typeof (bindings) !== 'object') {
					this._eventBus.emit('componentBound', {
						element,
						id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
					});
					return;
				}
				this._componentBindings[id] = Object.create(null);
				Object.keys(bindings)
					.forEach(eventName => {
						eventName = eventName.toLowerCase();
						if (eventName in this._componentBindings[id]) {
							return;
						}
						const selectorHandlers = Object.create(null);
						Object.keys(bindings[eventName])
							.forEach(selector => {
								const handler = bindings[eventName][selector];
								if (typeof (handler) !== 'function') {
									return;
								}
								selectorHandlers[selector] = handler.bind(instance);
							});
						this._componentBindings[id][eventName] = {
							handler: this._createBindingHandler(element, selectorHandlers),
							selectorHandlers
						};
						element.addEventListener(
							eventName,
							this._componentBindings[id][eventName].handler,
							NON_BUBBLING_EVENTS.hasOwnProperty(eventName)
						);
					});
				this._eventBus.emit('componentBound', {
					element,
					id
				});
			});
	}

	/**
	 * Creates a universal event handler for delegated events.
	 * @param {Element} componentRoot Root element of the component.
	 * @param {Object} selectorHandlers Map of event handlers by their CSS selectors.
	 * @returns {Function} Universal event handler for delegated events.
	 * @private
	 */
	_createBindingHandler(componentRoot, selectorHandlers) {
		const selectors = Object.keys(selectorHandlers);
		return event => {
			var element = event.target;
			const dispatchedEvent = createCustomEvent(event, () => element);
			var targetMatches = getMatchesMethod(element);
			var isHandled = selectors.some(selector => {
				if (targetMatches(selector)) {
					selectorHandlers[selector](dispatchedEvent);
					return true;
				}
				return false;
			});

			if (isHandled || !event.bubbles) {
				return;
			}

			while (element.parentElement && element !== componentRoot) {
				element = element.parentElement;
				targetMatches = getMatchesMethod(element);
				for (let i = 0; i < selectors.length; i++) {
					const selector = selectors[i];
					if (!targetMatches(selector)) {
						continue;
					}
					isHandled = true;
					selectorHandlers[selector](dispatchedEvent);
					break;
				}

				if (isHandled) {
					break;
				}
			}
		};
	}

	/**
	 * Checks if the element is a component.
	 * @param {Object} components Current components.
	 * @param {Element} element DOM element.
	 * @private
	 */
	_isComponent(components, element) {
		const currentNodeName = element.nodeName;
		return moduleHelper.COMPONENT_PREFIX_REGEXP.test(currentNodeName) &&
			(moduleHelper.getOriginalComponentName(currentNodeName) in components);
	}

	/**
	 * Finds all descendant components of the specified component element.
	 * @param {Element} element Root component's HTML element to begin search with.
	 * @param {Object} components Map of components by their names.
	 * @param {boolean} goInComponents Go inside nested components.
	 * @private
	 */
	_findComponentElements(element, components, goInComponents) {
		const elements = [];
		const queue = [element];

		while (queue.length > 0) {
			const currentChildren = queue.shift().childNodes;
			for (let i = 0; i < currentChildren.length; i++) {
				const currentChild = currentChildren[i];
				// we need only Element nodes
				if (currentChild.nodeType !== 1) {
					continue;
				}

				// and they should be components
				if (!this._isComponent(components, currentChild)) {
					queue.push(currentChild);
					continue;
				}

				if (goInComponents) {
					queue.push(currentChild);
				}
				elements.push(currentChild);
			}
		}
		return elements;
	}

	/**
	 * Handles an error while rendering.
	 * @param {Element} element Component's HTML element.
	 * @param {Object} component Component's instance.
	 * @param {Error} error Error to handle.
	 * @returns {Promise<string>} Promise for HTML string.
	 * @private
	 */
	_handleRenderError(element, component, error) {
		this._eventBus.emit('error', error);

		return Promise.resolve()
			.then(() => {
				// do not corrupt existed HEAD when error occurs
				if (element.tagName === TAG_NAMES.HEAD) {
					return '';
				}

				if (!this._config.isRelease && error instanceof Error) {
					errorHelper.prettyPrint(error, this._window.navigator.userAgent);
				} else if (component.errorTemplate) {
					return component.errorTemplate.render(error);
				}

				return '';
			})
			.catch(() => '');
	}

	/**
	 * Updates all components that depend on the current set of changed stores.
	 * @returns {Promise} Promise for nothing.
	 * @private
	 */
	_updateStoreComponents() {
		if (this._isUpdating) {
			return Promise.resolve();
		}

		// if document component is changed we should reload the page
		const documentStore = this._window.document.documentElement.getAttribute(
			moduleHelper.ATTRIBUTE_STORE
		);
		if (documentStore in this._currentChangedStores) {
			const newLocation = this._currentRoutingContext.location.toString();
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
			const components = this._componentLoader.getComponentsByNames();
			const changedByState = this._storeDispatcher.setState(
				this._awaitingRouting.state,
				this._awaitingRouting.routingContext
			);

			changedByState.forEach(name => {
				this._currentChangedStores[name] = true;
			});

			// we should update contexts of the stores with the new routing context
			this._currentRoutingContext = this._awaitingRouting.routingContext;
			Object.keys(this._componentInstances)
				.forEach(id => {
					const instance = this._componentInstances[id];
					instance.$context = this._getComponentContext(
						components[instance.$context.name],
						instance.$context.element
					);
				});
			this._awaitingRouting = null;
		}

		const changedStores = Object.keys(this._currentChangedStores);
		if (changedStores.length === 0) {
			this._isUpdating = false;
			return Promise.resolve();
		}

		this._currentChangedStores = Object.create(null);

		const renderingContext = this._createRenderingContext(changedStores);
		const promises = renderingContext.roots.map(root => {
			renderingContext.rootIds[this._getId(root)] = true;
			return this.renderComponent(root, renderingContext);
		});

		return Promise.all(promises)
			.catch(reason => this._eventBus.emit('error', reason))
			.then(() => {
				this._isUpdating = false;
				this._eventBus.emit('documentUpdated', changedStores);
				return this._updateStoreComponents();
			});
	}

	/**
	 * Merges new and existed head elements and applies only difference.
	 * @param {Element} head HEAD DOM element.
	 * @param {Element} newHead New HEAD element.
	 * @private
	 */
	/* eslint complexity: 0 */
	_mergeHead(head, newHead) {
		if (!newHead) {
			return;
		}

		const map = this._getHeadMap(head.childNodes);
		const sameMetaElements = Object.create(null);
		let i = 0;

		while (i < newHead.childNodes.length) {
			const current = newHead.childNodes[i++];
			const key = this._getNodeKey(current);

			if (!(current.nodeName in map)) {
				map[current.nodeName] = Object.create(null);
			}

			switch (current.nodeName) {
			// these elements can be only replaced
				case TAG_NAMES.TITLE:
				case TAG_NAMES.BASE:
				case TAG_NAMES.NOSCRIPT:
					const oldItem = head.getElementsByTagName(current.nodeName)[0];
					if (oldItem) {
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
					if (!(key in map[current.nodeName])) {
						head.appendChild(current);
						i--;
					}
					break;
				// meta and other elements can be deleted
				// but we should not delete and append same elements
				default:
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
				.forEach(metaKey => {
					if (metaKey in sameMetaElements) {
						return;
					}

					head.removeChild(map[TAG_NAMES.META][metaKey]);
				});
		}
	}

	/**
	 * Gets map of all HEAD's elements.
	 * @param {NodeList} headChildren Head children DOM nodes.
	 * @returns {Object} Map of HEAD's elements.
	 * @private
	 */
	_getHeadMap(headChildren) {
		// Create map of <meta>, <link>, <style> and <script> tags
		// by unique keys that contain attributes and content
		const map = Object.create(null);

		for (let i = 0; i < headChildren.length; i++) {
			const current = headChildren[i];
			if (!(current.nodeName in map)) {
				map[current.nodeName] = Object.create(null);
			}
			map[current.nodeName][this._getNodeKey(current)] = current;
		}
		return map;
	}

	/**
	 * Gets an unique element key using element's attributes and its content.
	 * @param {Node} node HTML element.
	 * @returns {string} Unique key for the element.
	 * @private
	 */
	_getNodeKey(node) {
		const attributes = [];

		if (node.nodeType !== NODE_TYPES.ELEMENT_NODE) {
			return node.nodeValue || '';
		}

		if (node.hasAttributes()) {
			for (let i = 0; i < node.attributes.length; i++) {
				const current = node.attributes[i];
				attributes.push(`${current.name}=${current.value}`);
			}
		}

		return `${attributes.sort().join('|')}>${node.textContent}`;
	}

	/**
	 * Does initial wrapping for every component on the page.
	 * @param {Object} components Current components map by their names.
	 * @param {Array} elements Elements list.
	 * @private
	 */
	_initialWrap(components, elements) {
		const current = elements.pop();

		return Promise.resolve()
			.then(() => {
				const id = this._getId(current);
				if (!id) {
					return null;
				}

				const componentName = moduleHelper.getOriginalComponentName(current.nodeName);
				if (!(componentName in components)) {
					return null;
				}
				const ComponentConstructor = components[componentName].constructor;
				ComponentConstructor.prototype.$context = this._getComponentContext(
					components[componentName], current
				);

				const instance = new ComponentConstructor(this._serviceLocator);
				instance.$context = ComponentConstructor.prototype.$context;
				this._componentElements[id] = current;
				this._componentInstances[id] = instance;
				// initialize the store of the component
				this._storeDispatcher.getStore(
					current.getAttribute(moduleHelper.ATTRIBUTE_STORE)
				);
				this._eventBus.emit('componentRendered', {
					name: componentName,
					attributes: instance.$context.attributes,
					context: instance.$context
				});
				return this._bindComponent(current);
			})
			.then(() => {
				if (elements.length > 0) {
					return this._initialWrap(components, elements);
				}

				this._eventBus.emit(
					'documentRendered', this._currentRoutingContext
				);
				return null;
			});
	}

	/**
	 * Gets a component context using the basic context.
	 * @param {Object} component Component details.
	 * @param {Element} element DOM element of the component.
	 * @returns {Object} Component's context.
	 * @private
	 */
	_getComponentContext(component, element) {
		const storeName = element.getAttribute(moduleHelper.ATTRIBUTE_STORE);
		const componentContext = Object.create(this._currentRoutingContext);

		// initialize the store of the component
		this._storeDispatcher.getStore(storeName);

		Object.defineProperties(componentContext, {
			name: {
				get: () => component.name,
				enumerable: true
			},
			attributes: {
				get: () => attributesToObject(element.attributes),
				enumerable: true
			}
		});

		componentContext.element = element;
		componentContext.getComponentById = id => this.getComponentById(id);
		componentContext.getComponentByElement = element =>
			this.getComponentByElement(element);
		componentContext.createComponent = (tagName, attributes) =>
			this.createComponent(tagName, attributes);
		componentContext.collectGarbage = () => this.collectGarbage();
		componentContext.getStoreData = () => {
			const currentStoreName = element.getAttribute(moduleHelper.ATTRIBUTE_STORE);
			return this._storeDispatcher.getStoreData(currentStoreName);
		};
		componentContext.sendAction = (name, args) => {
			const currentStoreName = element.getAttribute(moduleHelper.ATTRIBUTE_STORE);
			return this._storeDispatcher.sendAction(currentStoreName, name, args);
		};
		componentContext.sendBroadcastAction = (name, args) =>
			this._storeDispatcher.sendBroadcastAction(name, args);

		return Object.freeze(componentContext);
	}

	/**
	 * Finds all rendering roots on the page for all changed stores.
	 * @param {Array} changedStoreNames List of changed store's names.
	 * @returns {Array<Element>} HTML elements that are rendering roots.
	 * @private
	 */
	_findRenderingRoots(changedStoreNames) {
		const headStore = this._window.document.head.getAttribute(moduleHelper.ATTRIBUTE_STORE);
		const components = this._componentLoader.getComponentsByNames();
		const componentElements = Object.create(null);
		const storeNamesSet = Object.create(null);
		const rootsSet = Object.create(null);
		const roots = [];

		// we should find all components and then looking for roots
		changedStoreNames
			.forEach(storeName => {
				storeNamesSet[storeName] = true;
				componentElements[storeName] = this._window.document
					.querySelectorAll(`[${moduleHelper.ATTRIBUTE_ID}][${moduleHelper.ATTRIBUTE_STORE}="${storeName}"]`);
			});

		if (moduleHelper.HEAD_COMPONENT_NAME in components && headStore in storeNamesSet) {
			rootsSet[this._getId(this._window.document.head)] = true;
			roots.push(this._window.document.head);
		}

		changedStoreNames
			.forEach(storeName => {
				for (let i = 0; i < componentElements[storeName].length; i++) {
					const current = componentElements[storeName][i];
					let currentRoot = current;
					let lastRoot = currentRoot;
					let lastRootId = this._getId(current);

					while (currentRoot.parentElement) {
						currentRoot = currentRoot.parentElement;

						const currentId = this._getId(currentRoot);
						const currentStore = currentRoot.getAttribute(moduleHelper.ATTRIBUTE_STORE);
						const currentComponentName = moduleHelper.getOriginalComponentName(currentRoot.tagName);

						// store did not change state
						if (!currentStore || !(currentStore in storeNamesSet)) {
							continue;
						}

						// is not an active component
						if (!(currentComponentName in components)) {
							continue;
						}

						lastRoot = currentRoot;
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
	}

	/**
	 * Creates a rendering context.
	 * @param {Array?} changedStores Names of changed stores.
	 * @returns {{
	 *   config: Object,
	 *   renderedIds: {},
	 *   unboundIds: {},
	 *   isHeadRendered: boolean,
	 *   bindMethods: Array,
	 *   routingContext: Object,
	 *   components: Object,
	 *   roots: Array.<Element>
	 * }} The context object.
	 * @private
	 */
	_createRenderingContext(changedStores) {
		const components = this._componentLoader.getComponentsByNames();

		return {
			config: this._config,
			renderedIds: Object.create(null),
			unboundIds: Object.create(null),
			isHeadRendered: false,
			bindMethods: [],
			routingContext: this._currentRoutingContext,
			components,
			rootIds: Object.create(null),
			roots: changedStores ? this._findRenderingRoots(changedStores) : []
		};
	}

	/**
	 * Gets an ID of the element.
	 * @param {Element} element HTML element of the component.
	 * @returns {string} ID.
	 */
	_getId(element) {
		if (element === this._window.document.documentElement) {
			return SPECIAL_IDS.$$document;
		}
		if (element === this._window.document.head) {
			return SPECIAL_IDS.$$head;
		}
		return element.getAttribute(moduleHelper.ATTRIBUTE_ID);
	}

	/**
	 * Creates a temporary clone of the element.
	 * @param {Element} element DOM element.
	 * @returns {Element} Clone element.
	 * @private
	 */
	_createTemporaryElement(element) {
		const tmp = this._window.document.createElement(element.tagName);

		for (let i = 0; i < element.attributes.length; i++) {
			const current = element.attributes[i];
			tmp.setAttribute(current.name, current.value);
		}
		return tmp;
	}
}

/**
 * Converts NamedNodeMap of Attr items to the key-value object map.
 * @param {NamedNodeMap} attributes List of Element attributes.
 * @returns {Object} Map of attribute values by their names.
 */
function attributesToObject(attributes) {
	const result = Object.create(null);
	for (let i = 0; i < attributes.length; i++) {
		const current = attributes[i];
		result[current.name] = current.value;
	}
	return result;
}

/**
 * Gets a cross-browser "matches" method for the element.
 * @param {Element} element HTML element.
 * @returns {Function} "matches" method.
 */
function getMatchesMethod(element) {
	const method = (element.matches ||
		element.webkitMatchesSelector ||
		element.mozMatchesSelector ||
		element.oMatchesSelector ||
		element.msMatchesSelector);

	return method.bind(element);
}

/**
 * Creates an imitation of the original Event object but with specified currentTarget.
 * @param {Event} event Original event object.
 * @param {Function} currentTargetGetter Getter for the currentTarget.
 * @returns {Event} Wrapped event.
 */
function createCustomEvent(event, currentTargetGetter) {
	const catEvent = Object.create(event);
	const keys = [];
	const properties = {};

	/* eslint guard-for-in: 0 */
	for (const key in event) {
		keys.push(key);
	}
	keys.forEach(key => {
		if (typeof (event[key]) === 'function') {
			properties[key] = {
				get: () => event[key].bind(event)
			};
			return;
		}

		properties[key] = {
			get: () => event[key],
			set: value => {
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

module.exports = DocumentRenderer;
