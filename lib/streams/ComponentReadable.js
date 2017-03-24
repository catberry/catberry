'use strict';

const stream = require('stream');
const entities = require('entities');
const moduleHelper = require('../helpers/moduleHelper');
const hrTimeHelper = require('../helpers/hrTimeHelper');
const errorHelper = require('../helpers/errorHelper');
const HTMLTagTokenizer = require('./../tokenizers/HTMLTagTokenizer');
const tagTokenizer = new HTMLTagTokenizer();
const HTMLTokenizer = require('./../tokenizers/HTMLTokenizer');
const tokenizer = new HTMLTokenizer();

const BODY_TAG = 'body';
const CONTENT_TYPE = 'text/html; charset=utf-8';
const POWERED_BY = 'Catberry';

const HTML_ENTITY_REFERENCE_REGEXP = /\&#?\w+;/ig;

class ComponentReadable extends stream.Readable {

	/**
	 * Creates a new instance of the parser duplex stream.
	 * @param {Object} context Rendering parameters.
	 * @param {Object?} options Stream options.
	 */
	constructor(context, options) {
		super(options);

		/**
		 * Current rendering context.
		 * @type {Object}
		 * @private
		 */
		this._context = context;

		/**
		 * Current queue of found tags.
		 * @type {Array}
		 * @private
		 */
		this._tokenQueue = [];

		/**
		 * Current promise if tag is processing asynchronously.
		 * @type {Promise}
		 * @private
		 */
		this._processingFoundTagPromise = null;

		/**
		 * Current HTML delayed for response.
		 * @type {string}
		 * @private
		 */
		this._delayedHTML = '';

		/**
		 * Is delayed HTML flushed to the response.
		 * @type {boolean}
		 * @private
		 */
		this._isFlushed = false;

		/**
		 * Is rendering process canceled.
		 * @type {boolean}
		 * @private
		 */
		this._isCanceled = false;
	}

	/**
	 * Handles the HTML from found tag handler.
	 * @param {string} html HTML.
	 */
	renderHTML(html) {
		tokenizer.setHTMLString(html);
		const queue = [];
		var tokenDescriptor;
		while ((tokenDescriptor = tokenizer.next()).value !== null) {
			queue.push(tokenDescriptor);
		}
		this._tokenQueue = queue.concat(this._tokenQueue);
		this._processingFoundTagPromise = null;
		this.read(0);
	}

	/**
	 * Starts rendering the document template.
	 */
	renderDocument() {
		// if we did not render anything then start from root template
		if (this._isCanceled || this._context.isDocumentRendered) {
			return;
		}
		this._processingFoundTagPromise = this._foundComponentHandler({
			name: moduleHelper.DOCUMENT_COMPONENT_NAME,
			attributes: Object.create(null)
		});

		if (this._processingFoundTagPromise) {
			this._processingFoundTagPromise = this._processingFoundTagPromise
				.then(html => this.renderHTML(html));
		}
	}

	/**
	 * Handles found component tags.
	 * @param {Object} tagDetails Object with tag details.
	 * @returns {Promise<string>|null} Replacement stream of HTML.
	 * @private
	 */
	/* eslint complexity: 0 */
	_foundComponentHandler(tagDetails) {
		if (this._isCanceled) {
			return null;
		}

		if (tagDetails.name === BODY_TAG) {
			const inlineScript = this._context.routingContext.getInlineScript();
			return inlineScript ? Promise.resolve(inlineScript) : null;
		}

		const componentName = moduleHelper.getOriginalComponentName(tagDetails.name);
		const isDocument = moduleHelper.isDocumentComponent(tagDetails.name);
		const isHead = moduleHelper.isHeadComponent(tagDetails.name);

		if (isDocument) {
			if (this._context.isDocumentRendered) {
				return null;
			}
			this._context.isDocumentRendered = true;
		} else if (isHead) {
			if (this._context.isHeadRendered ||
				!this._context.components[componentName]) {
				return null;
			}
			this._context.isHeadRendered = true;
		}

		const component = this._context.components[componentName];
		if (!component) {
			return null;
		}

		const componentContext = Object.create(this._context);

		componentContext.currentComponent = component;
		componentContext.currentAttributes = tagDetails.attributes;

		return this._renderComponent(componentContext)
			.then(html => {
				if (!isDocument) {
					this._initializeResponse();
				}
				return html;
			});
	}

	/**
	 * Reads the next chunk of data from this stream.
	 * @private
	 */
	/* jshint maxcomplexity:false */
	_read() {
		if (this._processingFoundTagPromise) {
			this.push('');
			return;
		}

		if (this._tokenQueue.length === 0 || this._isCanceled) {
			this.push(null);
			return;
		}

		var toPush = '';
		while (this._tokenQueue.length > 0) {
			const tokenItem = this._tokenQueue.shift();

			if (tokenItem.state !== HTMLTokenizer.STATES.COMPONENT) {
				toPush += tokenItem.value;
				continue;
			}

			const tagDetails = this._parseTag(tokenItem.value);
			if (!tagDetails) {
				toPush += tokenItem.value;
				continue;
			}
			const processingPromise = this._foundComponentHandler(tagDetails);

			if (!processingPromise) {
				toPush += tokenItem.value;
				continue;
			}

			// we should open self-closed component tags
			// to set content into them
			if (tagDetails.isSelfClosed) {
				tokenItem.value = tokenItem.value.replace(/\/\w*>$/, '>');
				this._tokenQueue.unshift({
					token: HTMLTokenizer.STATES.CONTENT,
					value: `</${tagDetails.name}>`
				});
			}

			toPush += tokenItem.value;

			this._processingFoundTagPromise = processingPromise.then(html => this.renderHTML(html));
			break;
		}

		if (this._isFlushed) {
			this.push(toPush);
			return;
		}

		this._delayedHTML += toPush;

		if (!this._processingFoundTagPromise && this._tokenQueue.length === 0) {
			this._initializeResponse();
		}
	}

	/**
	 * Parses the entire HTML tag.
	 * @param {string} tagString Found tag token.
	 * @returns {Object} Tag details.
	 */
	_parseTag(tagString) {
		tagTokenizer.setTagString(tagString);
		const tag = {
			name: '',
			attributes: Object.create(null),
			isSelfClosed: false
		};

		var lastAttributeName = '';
		var current, currentString;

		/* eslint no-constant-condition: 0 */
		while (true) {
			current = tagTokenizer.next();
			switch (current.state) {
				case HTMLTagTokenizer.STATES.TAG_NAME:
					tag.name = tagString
						.substring(current.start, current.end)
						.toLowerCase();
					break;
				case HTMLTagTokenizer.STATES.ATTRIBUTE_NAME:
					currentString = tagString
						.substring(current.start, current.end)
						.toLowerCase();
					tag.attributes[currentString] = true;
					lastAttributeName = currentString;
					break;
				case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_DOUBLE_QUOTED:
				case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_SINGLE_QUOTED:
				case HTMLTagTokenizer.STATES.ATTRIBUTE_VALUE_UNQUOTED:
					currentString = tagString
						.substring(current.start, current.end)
						.replace(HTML_ENTITY_REFERENCE_REGEXP, entities.decode);
					tag.attributes[lastAttributeName] = currentString;
					break;
				case HTMLTagTokenizer.STATES.SELF_CLOSING_START_TAG_STATE:
					tag.isSelfClosed = true;
					break;
				case HTMLTagTokenizer.STATES.TAG_CLOSE:
					return tag;
				case HTMLTagTokenizer.STATES.ILLEGAL:
					return null;
			}
		}
	}

	/**
	 * Renders the component.
	 * @param {Object} context Component's rendering context.
	 * @returns {Promise<string>} HTML.
	 * @private
	 */
	_renderComponent(context) {
		const locator = context.routingContext.locator;
		const component = context.currentComponent;

		if (typeof (component.constructor) !== 'function') {
			return Promise.resolve('');
		}

		component.constructor.prototype.$context = this._getComponentContext(context);

		try {
			context.instance = new component.constructor(locator);
		} catch (e) {

			return moduleHelper.getSafePromise(() => this._handleComponentError(context, e));
		}

		context.instance.$context = component.constructor.prototype.$context;

		const startTime = hrTimeHelper.get();
		const eventArgs = {
			name: component.name,
			context: context.instance.$context
		};

		const renderMethod = moduleHelper.getMethodToInvoke(context.instance, 'render');
		const isDocument = moduleHelper.isDocumentComponent(component.name);
		const isHead = moduleHelper.isHeadComponent(component.name);

		this._context.eventBus.emit('componentRender', eventArgs);

		return moduleHelper.getSafePromise(renderMethod)
			// if data context has been returned
			// then render template
			.then(dataContext => {
				dataContext = dataContext || Object.create(null);
				return component.template.render(dataContext);
			})
			// if template has been rendered
			// component has been successfully rendered then return html
			.then(html => {
				eventArgs.hrTime = hrTimeHelper.get(startTime);
				eventArgs.time = hrTimeHelper.toMilliseconds(eventArgs.hrTime);

				this._context.eventBus.emit('componentRendered', eventArgs);

				const inlineScript = !isDocument && !isHead ?
					context.instance.$context.getInlineScript() : '';
				return inlineScript + html;
			})
			.catch(reason => this._handleComponentError(context, reason));
	}

	/**
	 * Handles a rendering error.
	 * @param {Object} context Rendering context.
	 * @param {Error} error Rendering error.
	 * @private
	 */
	_handleComponentError(context, error) {
		// if application in debug mode then render
		// error text in component
		const isRelease = Boolean(context.config.isRelease);
		const component = context.currentComponent;

		if (!isRelease && error instanceof Error &&
			!moduleHelper.isDocumentComponent(component.name) &&
			!moduleHelper.isHeadComponent(component.name)) {
			this._context.eventBus.emit('error', error);
			try {
				return errorHelper.prettyPrint(error, context.routingContext.userAgent);
			} catch (e) {
				return '';
			}
		}

		if (component.errorTemplate) {
			return moduleHelper.getSafePromise(() => component.errorTemplate.render(error))
				.catch(reason => {
					this._context.eventBus.emit('error', reason);
					return '';
				});
		}

		this._context.eventBus.emit('error', error);
		return '';
	}

	/**
	 * Gets the component's context using basic context.
	 * @param {Object} context Rendering context.
	 * @returns {Object} Component context.
	 * @private
	 */
	_getComponentContext(context) {
		const attributes = context.currentAttributes;
		const storeName = attributes[moduleHelper.ATTRIBUTE_STORE];
		const componentContext = Object.create(context.routingContext);

		componentContext.element = null;
		componentContext.name = context.currentComponent.name;
		componentContext.attributes = attributes;

		// search methods
		componentContext.getComponentById = nullStub;
		componentContext.getComponentByElement = nullStub;
		componentContext.getComponentsByTagName = arrayStub;
		componentContext.getComponentsByClassName = arrayStub;
		componentContext.queryComponentSelector = nullStub;
		componentContext.queryComponentSelectorAll = arrayStub;

		// create/remove
		componentContext.createComponent = promiseStub;
		componentContext.collectGarbage = promiseStub;

		// store methods
		componentContext.getStoreData =
			() => context.storeDispatcher.getStoreData(storeName);
		componentContext.sendAction =
			(name, args) => context.storeDispatcher.sendAction(storeName, name, args);

		return Object.freeze(componentContext);
	}

	/**
	 * Initializes a HTTP response with the required code and headers.
	 * @private
	 */
	_initializeResponse() {
		if (this._isFlushed) {
			return;
		}
		this._isFlushed = true;

		const routingContext = this._context.routingContext;
		const response = routingContext.middleware.response;

		if (routingContext.actions.redirectedTo) {
			response.writeHead(routingContext.actions.redirectionStatusCode, {
				Location: routingContext.actions.redirectedTo
			});
			routingContext.actions.redirectedTo = '';
			routingContext.actions.redirectionStatusCode = null;
			this._isCanceled = true;
			this.push(null);
			return;
		}

		if (routingContext.actions.isNotFoundCalled) {
			routingContext.actions.isNotFoundCalled = false;
			this._isCanceled = true;
			routingContext.middleware.next();
			return;
		}

		const headers = {
			'Content-Type': CONTENT_TYPE,
			'X-Powered-By': POWERED_BY
		};
		if (routingContext.cookie.setCookie.length > 0) {
			headers['Set-Cookie'] = routingContext.cookie.setCookie;
		}
		response.writeHead(200, headers);
		routingContext.cookie.setCookie = [];

		if (this._delayedHTML) {
			this.push(this._delayedHTML);
			this._delayedHTML = '';
		}
	}
}

/**
 * Does nothing as a stub method.
 * @returns {null} Always null.
 */
function nullStub() {
	return null;
}

/**
 * Does nothing as a stub method.
 * @returns {Promise} Always a promise for null.
 */
function promiseStub() {
	return Promise.resolve(null);
}

/**
 * Does nothing as a stub method.
 * @returns {Array} Always an empty array.
 */
function arrayStub() {
	return [];
}

module.exports = ComponentReadable;
