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

module.exports = ComponentTransform;

var util = require('util'),
	stream = require('stream'),
	moduleHelper = require('../helpers/moduleHelper'),
	hrTimeHelper = require('../helpers/hrTimeHelper'),
	errorHelper = require('../helpers/errorHelper'),
	ContentReadable = require('./ContentReadable'),
	ParserDuplex = require('./ParserDuplex');

var BODY_TAG = 'body';

util.inherits(ComponentTransform, ParserDuplex);

/**
 * Creates new instance of the component transformation stream.
 * @param {Object} context Rendering parameters.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends ParserDuplex
 */
function ComponentTransform(context, options) {
	ParserDuplex.call(this, options);
	this._context = context;

	// if we did not render anything then start from root template
	if (!this._context.isCanceled &&
		!this._context.isDocumentRendered) {
		return this.foundComponentHandler({
			name: moduleHelper.DOCUMENT_COMPONENT_NAME,
			attributes: Object.create(null)
		});
	}
}

/**
 * Current rendering context.
 * @type {Object}
 * @private
 */
ComponentTransform.prototype._context = null;

/**
 * Handles found component tags.
 * @param {Object} tagDetails Object with tag details.
 * @returns {Readable|null} Replacement stream of HTML or null.
 */
/*jshint maxcomplexity:false */
ComponentTransform.prototype.foundComponentHandler = function (tagDetails) {
	if (this._context.isCanceled) {
		return null;
	}

	if (tagDetails.name === BODY_TAG) {
		var inlineScript = this._context.routingContext.getInlineScript();
		return inlineScript ? new ContentReadable(inlineScript) : null;
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

	var innerParserStream = new ComponentTransform(this._context),
		componentContext = Object.create(this._context);

	componentContext.currentComponent = component;
	componentContext.currentAttributes = tagDetails.attributes;

	this._renderComponent(componentContext)
		.then(function (html) {
			innerParserStream.write(html);
			innerParserStream.end();
		});

	return innerParserStream;
};

/**
 * Renders component.
 * @param {Object} context Component rendering context.
 * @returns {string} HTML.
 * @private
 */
ComponentTransform.prototype._renderComponent = function (context) {
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
ComponentTransform.prototype._handleComponentError = function (context, error) {
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
ComponentTransform.prototype._getComponentContext = function (context) {
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