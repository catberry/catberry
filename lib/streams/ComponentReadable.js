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

module.exports = ComponentReadable;

var util = require('util'),
	stream = require('stream'),
	moduleHelper = require('../helpers/moduleHelper'),
	errorHelper = require('../helpers/errorHelper');

util.inherits(ComponentReadable, stream.PassThrough);

var ATTRIBUTE_STORE = 'cat-store';

/**
 * Creates new instance of component rendering stream.
 * @param {Object} renderingContext Rendering context.
 * @param {Object} options Stream options.
 * @constructor
 */
function ComponentReadable(renderingContext, options) {
	stream.PassThrough.call(this, options);
	this._renderingContext = renderingContext;

	var config = this._renderingContext.locator.resolve('config'),
		component = this._renderingContext.currentComponent;

	this._componentInstance = typeof(component.constructor) === 'function' ?
		this._renderingContext.locator.resolveInstance(
			component.constructor, config
		) : null;
}

/**
 * Current rendering context;
 * @type {Object}
 * @private
 */
ComponentReadable.prototype._renderingContext = null;

/**
 * Current component instance.
 * @type {Object}
 * @private
 */
ComponentReadable.prototype._componentInstance = null;

/**
 * Renders component into current stream.
 */
ComponentReadable.prototype.render = function () {
	if (!this._componentInstance) {
		this.end();
		return;
	}

	var component = this._renderingContext.currentComponent,
		attributes = this._renderingContext.currentAttributes,
		startTime = Date.now(),
		self = this,
		storeDataPromise = attributes[ATTRIBUTE_STORE] ?
			this._renderingContext.storeDispatcher.getStoreData(
				attributes[ATTRIBUTE_STORE],
				this._renderingContext.routingContext
			) : Promise.resolve(null);

	this._componentInstance.$context = this._getComponentContext(
		component.name, attributes, this._renderingContext.routingContext
	);

	var eventArgs = {
		name: component.name,
		attributes: attributes,
		context: this._componentInstance.$context
	};

	storeDataPromise
		// first of all trying to render component
		.then(function (data) {
			self._componentInstance.$context.storeData = data || {};
			var renderMethod = moduleHelper.getMethodToInvoke(
				self._componentInstance,
				'render'
			);

			self._renderingContext.eventBus.emit('componentRender', eventArgs);
			return renderMethod();
		})
		// if data context has been returned
		// then render template and inline scripts
		.then(function (dataContext) {
			dataContext = dataContext || {};
			var isDocument = moduleHelper.isDocumentComponent(
				self._renderingContext.currentComponent.name
			);

			if (!isDocument) {
				self.write(self._componentInstance.$context.getInlineScript());
			}
			return component.template.render(dataContext);
		})
		// if template has been rendered
		// component has been successfully rendered then return html
		.then(function (html) {
			eventArgs.time = Date.now() - startTime;
			self._renderingContext.eventBus.emit(
				'componentRendered', eventArgs
			);
			self.end(html);
		})
		.catch(function (reason) {
			self._handleError(reason);
		});
};

/**
 * Handles any rendering error.
 * @param {Error} error Rendering error.
 * @private
 */
ComponentReadable.prototype._handleError = function (error) {
	// if application in debug mode then render
	// error text in component
	if (!this._renderingContext.isRelease && error instanceof Error) {
		this.write(errorHelper.prettyPrint(
			error, this._componentInstance.$context.userAgent
		));
		this.emit('error', error);
		this.end();
	} else if (this._renderingContext.currentComponent.errorTemplate) {
		var self = this;
		this._renderingContext.currentComponent.errorTemplate.render(error)
			.then(function (html) {
				self.end(html);
			})
			.catch(function (reason) {
				self.emit('error', reason);
				self.end();
			});
	} else {
		this.emit('error', error);
		this.end();
	}
};

/**
 * Gets component context using basic context.
 * @param {String} componentName Name of the component.
 * @param {Object} attributes Map of component's attributes.
 * @param {ModuleApiProvider} basicContext Basic context.
 * @returns {Object} Component context.
 * @private
 */
ComponentReadable.prototype._getComponentContext =
	function (componentName, attributes, basicContext) {
		var self = this,
			storeName = attributes[ATTRIBUTE_STORE],
			componentContext = Object.create(basicContext);

		componentContext.storeData = null;
		componentContext.element = null;
		componentContext.getElementById = stub;
		componentContext.name = componentName;
		componentContext.attributes = attributes;
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
 * Does nothing as a stub method.
 * @returns {null}
 */
function stub() {
	return null;
}