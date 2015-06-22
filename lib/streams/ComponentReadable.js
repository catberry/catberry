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

module.exports = ComponentReadable;

var stream = require('stream'),
	entities = require('entities'),
	util = require('util'),
	moduleHelper = require('../helpers/moduleHelper'),
	hrTimeHelper = require('../helpers/hrTimeHelper'),
	errorHelper = require('../helpers/errorHelper'),
	HTMLTagTokenizer = require('./HTMLTagTokenizer'),
	tagTokenizer = new HTMLTagTokenizer(),
	HTMLTokenizer = require('./HTMLTokenizer'),
	tokenizer = new HTMLTokenizer();

var BODY_TAG = 'body';

util.inherits(ComponentReadable, stream.Readable);

var COMPONENT_TAG_NAME_REGEXP = /^<((cat-)|((document|head|body)[\s/>]))/i,
	HTML_ENTITY_REFERENCE_REGEXP = /\&#?\w+;/ig;

/**
 * Creates new instance of the parser duplex stream.
 * @param {Object} context Rendering parameters.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends Readable
 */
function ComponentReadable(context, options) {
	stream.Readable.call(this, options);
	this._context = context;
	this._tokenQueue = [];
}

/**
 * Current queue of found tags.
 * @type {Array}
 * @private
 */
ComponentReadable.prototype._tokenQueue = null;

/**
 * Current promise if tag is processing asynchronously.
 * @type {Promise}
 * @private
 */
ComponentReadable.prototype._processingFoundTagPromise = null;

/**
 * Current rendering context.
 * @type {Object}
 * @private
 */
ComponentReadable.prototype._context = null;

/**
 * Handles the HTML from found tag handler.
 * @param {string} html HTML.
 */
ComponentReadable.prototype.renderHTML = function (html) {
	tokenizer.setHTMLString(html);
	var tokenDescriptor, queue = [];
	while (true) {
		tokenDescriptor = tokenizer.getNext();
		if (!tokenDescriptor) {
			break;
		}

		queue.push(tokenDescriptor);
	}
	this._tokenQueue = queue.concat(this._tokenQueue);
	this._processingFoundTagPromise = null;
	this.read(0);
};

/**
 * Starts rendering the document template.
 */
ComponentReadable.prototype.renderDocument = function () {
	// if we did not render anything then start from root template
	if (this._context.isCanceled || this._context.isDocumentRendered) {
		return;
	}
	this._processingFoundTagPromise = this._foundComponentHandler({
		name: moduleHelper.DOCUMENT_COMPONENT_NAME,
		attributes: Object.create(null)
	})
		.then(this.renderHTML.bind(this));
};

/**
 * Handles found component tags.
 * @param {Object} tagDetails Object with tag details.
 * @returns {Promise<string>|null} Replacement stream of HTML.
 * @private
 */
/*jshint maxcomplexity:false */
ComponentReadable.prototype._foundComponentHandler = function (tagDetails) {
	if (this._context.isCanceled) {
		return null;
	}

	if (tagDetails.name === BODY_TAG) {
		var inlineScript = this._context.routingContext.getInlineScript();
		return inlineScript ? Promise.resolve(inlineScript) : null;
	}

	var componentName = moduleHelper.getOriginalComponentName(tagDetails.name),
		id = tagDetails.attributes[moduleHelper.ATTRIBUTE_ID],
		isDocument = moduleHelper.isDocumentComponent(tagDetails.name),
		isHead = moduleHelper.isHeadComponent(tagDetails.name);

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
	} else if (!id || this._context.renderedIds[id]) {
		return null;
	}

	var component = this._context.components[componentName];
	if (!component) {
		return null;
	}

	if (id) {
		this._context.renderedIds[id] = true;
	}

	var componentContext = Object.create(this._context);

	componentContext.currentComponent = component;
	componentContext.currentAttributes = tagDetails.attributes;

	return this._renderComponent(componentContext);
};

/**
 * Reads next chunk of data from this stream.
 * @private
 */
/*jshint maxcomplexity:false */
ComponentReadable.prototype._read = function () {
	var self = this;
	if (this._processingFoundTagPromise) {
		this.push('');
		return;
	}

	if (this._tokenQueue.length === 0) {
		this.push(null);
		return;
	}

	var toPush = '';
	while (this._tokenQueue.length > 0) {
		var tokenItem = this._tokenQueue.shift();

		if (tokenItem.token !== HTMLTokenizer.TOKENS.TAG_TOKEN ||
			!COMPONENT_TAG_NAME_REGEXP.test(tokenItem.value)) {
			toPush += tokenItem.value;
			continue;
		}

		var tagDetails = this._parseTag(tokenItem.value);
		if (!tagDetails) {
			toPush += tokenItem.value;
			continue;
		}

		var processingPromise = this._foundComponentHandler(tagDetails);
		if (!processingPromise) {
			toPush += tokenItem.value;
			continue;
		}

		// we should open self-closed component tags
		// to set content into them
		if (tagDetails.isSelfClosed) {
			tokenItem.value = tokenItem.value.replace(/\/\w*>$/, '>');
			this._tokenQueue.unshift({
				token: HTMLTokenizer.TOKENS.TAG_TOKEN,
				value: '</' + tagDetails.name + '>'
			});
		}

		toPush += tokenItem.value;

		self._processingFoundTagPromise =
			processingPromise.then(this.renderHTML.bind(this));

		break;
	}

	this.push(toPush);
};

/**
 * Parses entire HTML tag.
 * @param {String} tagString Found tag token.
 * @returns {Object} Tag details.
 */
ComponentReadable.prototype._parseTag = function (tagString) {
	tagTokenizer.setTagString(tagString);
	var lastAttributeName = '',
		current, currentString,
		tag = {
			name: '',
			attributes: Object.create(null),
			isSelfClosed: false
		};
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
};

/**
 * Renders component.
 * @param {Object} context Component rendering context.
 * @returns {Promise<string>} HTML.
 * @private
 */
ComponentReadable.prototype._renderComponent = function (context) {
	var locator = context.routingContext.locator,
		component = context.currentComponent;

	if (typeof(component.constructor) !== 'function') {
		return Promise.resolve('');
	}
	component.constructor.prototype.$context = this._getComponentContext(
		context
	);
	context.instance = locator.resolveInstance(
		component.constructor, context.config
	);
	context.instance.$context = component.constructor.prototype.$context;

	var self = this,
		startTime = hrTimeHelper.get(),
		eventArgs = {
			name: component.name,
			context: context.instance.$context
		},
		renderMethod = moduleHelper.getMethodToInvoke(
			context.instance, 'render'
		),
		isDocument = moduleHelper.isDocumentComponent(component.name),
		isHead = moduleHelper.isHeadComponent(component.name);

	context.eventBus.emit('componentRender', eventArgs);

	return moduleHelper.getSafePromise(renderMethod)
		// if data context has been returned
		// then render template
		.then(function (dataContext) {
			dataContext = dataContext || Object.create(null);
			if (!isDocument) {
				context.allowFlushing();
			}
			return component.template.render(dataContext);
		})
		// if template has been rendered
		// component has been successfully rendered then return html
		.then(function (html) {
			eventArgs.hrTime = hrTimeHelper.get(startTime);
			eventArgs.time = eventArgs.hrTime[0];

			context.eventBus.emit('componentRendered', eventArgs);

			var inlineScript = !isDocument && !isHead ?
				context.instance.$context.getInlineScript() : '';
			return inlineScript + html;
		})
		.catch(function (reason) {
			return self._handleComponentError(context, reason);
		});
};

/**
 * Handles any rendering error.
 * @param {Object} context Rendering context.
 * @param {Error} error Rendering error.
 * @private
 */
ComponentReadable.prototype._handleComponentError = function (context, error) {
	// if application in debug mode then render
	// error text in component
	var isRelease = Boolean(context.config.isRelease),
		component = context.currentComponent;

	if (!isRelease && error instanceof Error &&
		!moduleHelper.isDocumentComponent(component.name) &&
		!moduleHelper.isHeadComponent(component.name)) {
		context.eventBus.emit('error', error);
		return errorHelper.prettyPrint(
			error, context.instance.$context.userAgent
		);
	} else if (component.errorTemplate) {
		var renderMethod = function () {
			return component.errorTemplate.render(error);
		};

		return moduleHelper.getSafePromise(renderMethod)
			.catch(function (reason) {
				context.eventBus.emit('error', reason);
				return '';
			});
	} else {
		context.eventBus.emit('error', error);
		return '';
	}
};

/**
 * Gets component context using basic context.
 * @param {Object} context Context of rendering.
 * @returns {Object} Component context.
 * @private
 */
ComponentReadable.prototype._getComponentContext = function (context) {
	var attributes = context.currentAttributes,
		storeName = attributes[moduleHelper.ATTRIBUTE_STORE];
	return Object.create(context.routingContext, {
		element: {
			value: null,
			enumerable: true
		},
		name: {
			value: context.currentComponent.name,
			enumerable: true
		},
		attributes: {
			value: attributes,
			enumerable: true
		},
		getComponentById: {
			value: stub
		},
		createComponent: {
			value: stub
		},
		collectGarbage: {
			value: stub
		},
		getStoreData: {
			value: function () {
				return context.storeDispatcher
					.getStoreData(storeName);
			}
		},
		sendAction: {
			value: function (name, args) {
				return context.storeDispatcher
					.sendAction(storeName, name, args);
			}
		},
		sendBroadcastAction: {
			value: function (name, args) {
				return context.storeDispatcher
					.sendBroadcastAction(name, args);
			}
		}
	});
};

/**
 * Does nothing as a stub method.
 * @returns {null}
 */
function stub() {
	return null;
}