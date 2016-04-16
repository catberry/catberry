'use strict';

const morphdom = require('morphdom');
const uuid = require('uuid');
const errorHelper = require('../lib/helpers/errorHelper');
const moduleHelper = require('../lib/helpers/moduleHelper');
const hrTimeHelper = require('../lib/helpers/hrTimeHelper');
const DocumentRendererBase = require('../lib/base/DocumentRendererBase');

const SPECIAL_IDS = {
	$$head: '$$head',
	$$document: '$$document'
};
const TAG_NAMES = {
	HEAD: 'HEAD',
	STYLE: 'STYLE',
	SCRIPT: 'SCRIPT',
	LINK: 'LINK'
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

		/**
		 * Current browser's window.
		 */
		this._window = locator.resolve('window');

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

				// the document component is not represented by its element in DOM
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

				if (!renderingContext) {
					renderingContext = this._createRenderingContext([]);
					renderingContext.rootIds[id] = true;
				}

				const hadChildren = (element.children.length > 0);
				const component = renderingContext.components[componentName];
				if (!component) {
					return null;
				}

				renderingContext.renderedIds[id] = true;

				let instance = this._componentInstances[id];
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

						const tmpElement = element.cloneNode(false);
						tmpElement.innerHTML = html;

						if (isHead) {
							this._mergeHead(element, tmpElement);
							return [];
						}

						morphdom(element, tmpElement, {
							onBeforeMorphElChildren: foundElement =>
								foundElement === element || !this._isComponentElement(
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
	 * @param {string} id Component's element ID.
	 * @returns {Object|null} Component instance.
	 */
	getComponentById(id) {
		const element = this._window.document.getElementById(id);
		return this.getComponentByElement(element);
	}

	/**
	 * Does query for a component by the selector.
	 * @param {string} selector Selector for the query.
	 * @param {Object?} parentComponent Parent component object.
	 * @returns {Object} The found component object.
	 */
	queryComponentSelector(selector, parentComponent) {
		const parent = this._isComponentObject(parentComponent) ?
			parentComponent.$context.element : this._window.document;
		return this.getComponentByElement(parent.querySelector(selector));
	}

	/**
	 * Does query for all components by the selector.
	 * @param {string} selector Selector for the query.
	 * @param {Object?} parentComponent Parent component object.
	 * @returns {Array} The found component object list.
	 */
	queryComponentSelectorAll(selector, parentComponent) {
		const parent = this._isComponentObject(parentComponent) ?
			parentComponent.$context.element : this._window.document;
		return this._mapElementsToComponents(parent.querySelectorAll(selector));
	}

	/**
	 * Gets all components by the tag name.
	 * @param {string} tagName Tag name of the components.
	 * @param {Object?} parentComponent Parent component object.
	 * @returns {Array} The found component object list.
	 */
	getComponentsByTagName(tagName, parentComponent) {
		const parent = this._isComponentObject(parentComponent) ?
			parentComponent.$context.element : this._window.document;
		return this._mapElementsToComponents(parent.getElementsByTagName(tagName));
	}

	/**
	 * Gets all components by the class name.
	 * @param {string} className Class name of the components.
	 * @param {Object?} parentComponent Parent component object.
	 * @returns {Array} The found component object list.
	 */
	getComponentsByClassName(className, parentComponent) {
		const parent = this._isComponentObject(parentComponent) ?
			parentComponent.$context.element : this._window.document;
		return this._mapElementsToComponents(parent.getElementsByClassName(className));
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
		const id = element[moduleHelper.COMPONENT_ID];
		if (!id) {
			return null;
		}
		return this._componentInstances[id] || null;
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

						const element = this._componentElements[id];
						if (this._window.document.body.contains(element)) {
							return;
						}

						const promise = this._unbindComponent(element)
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
				const element = this._window.document.createElement(safeTagName);
				Object.keys(attributes)
					.forEach(attributeName => element.setAttribute(attributeName, attributes[attributeName]));

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
					id: element.id || null
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
						id: element.id || null
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
					id: element.id || null
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
				isHandled = this._tryDispatchEvent(
					selectors, targetMatches, selectorHandlers, dispatchedEvent
				);
				if (isHandled) {
					break;
				}
			}
		};
	}

	/**
	 * Tries to dispatch an event.
	 * @param {Array} selectors The list of supported selectors.
	 * @param {Function} matchPredicate The function to check if selector matches.
	 * @param {Object} handlers The set of handlers for events.
	 * @param {Event} event The DOM event object.
	 * @private
	 */
	_tryDispatchEvent(selectors, matchPredicate, handlers, event) {
		return selectors.some(selector => {
			if (!matchPredicate(selector)) {
				return false;
			}
			handlers[selector](event);
			return true;
		});
	}

	/**
	 * Checks if the element is a component.
	 * @param {Object} components Current components.
	 * @param {Element} element DOM element.
	 * @private
	 */
	_isComponentElement(components, element) {
		if (!moduleHelper.isComponentNode(element)) {
			return false;
		}
		return moduleHelper.getOriginalComponentName(element.nodeName) in components;
	}

	/**
	 * Checks if the specified object is a component.
	 * @param {Object} obj The component object.
	 * @returns {boolean}
	 * @private
	 */
	_isComponentObject(obj) {
		return obj && obj.$context &&
			typeof (obj.$context) === 'object' &&
			obj.$context.element instanceof this._window.Element;
	}

	/**
	 * Maps found elements to component objects filtering non-component elements.
	 * @param {HTMLCollection|NodeList} elements Elements collection.
	 * @returns {Array} Array of the component objects.
	 * @private
	 */
	_mapElementsToComponents(elements) {
		const results = [];
		Array.prototype.forEach
			.call(elements, element => {
				const component = this.getComponentByElement(element);
				if (component) {
					results.push(component);
				}
			});
		return results;
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
			const currentChildren = queue.shift().children;
			if (!currentChildren) {
				continue;
			}

			Array.prototype.forEach.call(currentChildren, currentChild => {
				// and they should be components
				if (!this._isComponentElement(components, currentChild)) {
					queue.push(currentChild);
					return;
				}

				if (goInComponents) {
					queue.push(currentChild);
				}
				elements.push(currentChild);
			});
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
					return errorHelper.prettyPrint(error, this._window.navigator.userAgent);
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

			// we should update contexts of the components with the new routing context
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
	 * The problem here is that we can't re-create or change script and style tags,
	 * because it causes blinking and JavaScript re-initialization. Therefore such
	 * element must be immutable in the HEAD.
	 * @param {Node} head HEAD DOM element.
	 * @param {Node} newHead New HEAD element.
	 * @private
	 */
	_mergeHead(head, newHead) {
		if (!newHead) {
			return;
		}

		const headSet = Object.create(null);

		// remove all nodes from the current HEAD except immutable ones
		for (let i = 0; i < head.childNodes.length; i++) {
			const current = head.childNodes[i];
			if (!isTagImmutable(current)) {
				head.removeChild(current);
				i--;
				continue;
			}
			// we need to collect keys for immutable elements to handle
			// attributes reordering
			headSet[this._getElementKey(current)] = true;
		}

		for (let i = 0; i < newHead.children.length; i++) {
			const current = newHead.children[i];
			if (this._getElementKey(current) in headSet) {
				continue;
			}
			head.appendChild(current);
			// when we append existing child to another parent it removes
			// the node from a previous parent
			i--;
		}
	}

	/**
	 * Gets an unique element key using element's attributes and its content.
	 * @param {Element} element HTML element.
	 * @returns {string} Unique key for the element.
	 * @private
	 */
	_getElementKey(element) {
		// some immutable elements have several valuable attributes
		// these attributes define the element identity
		const attributes = [];

		switch (element.nodeName) {
			case TAG_NAMES.LINK:
				attributes.push(`href=${element.getAttribute('href')}`);
				break;
			case TAG_NAMES.SCRIPT:
				attributes.push(`src=${element.getAttribute('src')}`);
				break;
		}

		return `<${element.nodeName} ${attributes.sort().join(' ')}>${element.textContent}</${element.nodeName}>`;
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
				const componentName = moduleHelper.getOriginalComponentName(current.nodeName);
				if (!(componentName in components)) {
					return null;
				}

				const id = this._getId(current);
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

		// search methods
		componentContext.getComponentById =
			id => this.getComponentById(id);

		componentContext.getComponentByElement =
			element => this.getComponentByElement(element);

		componentContext.getComponentsByTagName =
			(tagName, parent) => this.getComponentsByTagName(tagName, parent);

		componentContext.getComponentsByClassName =
			(className, parent) => this.getComponentsByClassName(className, parent);

		componentContext.queryComponentSelector =
			(selector, parent) => this.queryComponentSelector(selector, parent);

		componentContext.queryComponentSelectorAll =
			(selector, parent) => this.queryComponentSelectorAll(selector, parent);

		// create/remove
		componentContext.createComponent = (tagName, attributes) =>
			this.createComponent(tagName, attributes);
		componentContext.collectGarbage = () => this.collectGarbage();

		// store methods
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

		// we should find all components and then look for roots
		changedStoreNames
			.forEach(storeName => {
				storeNamesSet[storeName] = true;
				const elements = this._window.document
					.querySelectorAll(`[${moduleHelper.ATTRIBUTE_STORE}="${storeName}"]`);
				if (elements.length === 0) {
					return;
				}
				componentElements[storeName] = elements;
			});

		if (headStore in storeNamesSet && moduleHelper.HEAD_COMPONENT_NAME in components) {
			rootsSet[this._getId(this._window.document.head)] = true;
			roots.push(this._window.document.head);
		}

		changedStoreNames
			.forEach(storeName => {
				if (!(storeName in componentElements)) {
					return;
				}

				// we can optimize and don't go the same path twice
				const visitedIds = Object.create(null);

				Array.prototype.forEach.call(componentElements[storeName], current => {
					if (!moduleHelper.isComponentNode(current)) {
						return;
					}

					let currentRoot = current;
					let lastRoot = currentRoot;
					let lastRootId = this._getId(current);
					if (lastRootId in visitedIds) {
						return;
					}
					visitedIds[lastRootId] = true;

					while (currentRoot.parentElement) {
						currentRoot = currentRoot.parentElement;

						// if we go the same route we visited before we can
						// proceed with the next element
						const currentId = this._getId(currentRoot);
						if (currentId in visitedIds) {
							return;
						}

						const currentStore = currentRoot.getAttribute(moduleHelper.ATTRIBUTE_STORE);
						const currentComponentName = moduleHelper.getOriginalComponentName(currentRoot.tagName);

						// store did not change state
						if (!currentStore || !(currentStore in storeNamesSet)) {
							continue;
						}

						// this component element does not have an
						// implementation, skipping....
						if (!(currentComponentName in components)) {
							continue;
						}

						lastRoot = currentRoot;
						lastRootId = currentId;
					}

					// we don't want the same root element twice
					if (lastRootId in rootsSet) {
						return;
					}
					rootsSet[lastRootId] = true;
					roots.push(lastRoot);
				});
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

		// if the element does not have an ID we create it
		if (!element[moduleHelper.COMPONENT_ID]) {
			element[moduleHelper.COMPONENT_ID] = uuid.v4();
			// deal with possible collisions
			while (element[moduleHelper.COMPONENT_ID] in this._componentInstances) {
				element[moduleHelper.COMPONENT_ID] = uuid.v4();
			}
		}
		return element[moduleHelper.COMPONENT_ID];
	}
}

/**
 * Converts NamedNodeMap of Attr items to the key-value object map.
 * @param {NamedNodeMap} attributes List of Element attributes.
 * @returns {Object} Map of attribute values by their names.
 */
function attributesToObject(attributes) {
	const result = Object.create(null);
	Array.prototype.forEach.call(attributes, current => {
		result[current.name] = current.value;
	});
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

/**
 * Checks if we can mutate the specified HTML tag.
 * @param {Element} element The DOM element.
 * @returns {boolean} true if element should not be mutated.
 */
function isTagImmutable(element) {
	// these 3 kinds of tags once loaded can not be removed
	// otherwise it will cause style or script reloading
	return element.nodeName === TAG_NAMES.SCRIPT ||
		element.nodeName === TAG_NAMES.STYLE ||
		element.nodeName === TAG_NAMES.LINK &&
		element.getAttribute('rel') === 'stylesheet';
}

module.exports = DocumentRenderer;
