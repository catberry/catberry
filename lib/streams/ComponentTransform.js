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
	ComponentReadable = require('./ComponentReadable'),
	ParserDuplex = require('./ParserDuplex');

util.inherits(ComponentTransform, ParserDuplex);

/**
 * Creates new instance of placeholder transformation stream.
 * @param {Object} context Rendering parameters.
 * @param {Object?} options Stream options.
 * @constructor
 * @extends ParserDuplex
 */
function ComponentTransform(context, options) {
	ParserDuplex.call(this, options);
	this._context = context;

	// if we did not render anything then start from root template
	if (!this._context.isDocumentRendered) {
		this.foundComponentHandler({
			name: moduleHelper.DOCUMENT_COMPONENT_NAME,
			attributes: {}
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
 * @returns {Promise<Readable>} Promise for replace stream of HTML
 * element content.
 */
ComponentTransform.prototype.foundComponentHandler = function (tagDetails) {
	var component,
		componentName = moduleHelper.getOriginalComponentName(tagDetails.name);

	if (moduleHelper.isDocumentComponent(tagDetails.name)) {
		if (this._context.isDocumentRendered) {
			return null;
		}
		component = this._context
			.components[moduleHelper.DOCUMENT_COMPONENT_NAME];
		this._context.isDocumentRendered = true;
	} else if (moduleHelper.isHeadComponent(tagDetails.name)) {
		if (this._context.isHeadRendered) {
			return null;
		}
		component = this._context.components[moduleHelper.HEAD_COMPONENT_NAME];
		this._context.isHeadRendered = true;
	} else if(componentName in this._context.components &&
			moduleHelper.ATTRIBUTE_ID in tagDetails.attributes) {
		var id = tagDetails.attributes[moduleHelper.ATTRIBUTE_ID];
		if (id && !this._renderingContext.renderedIds.hasOwnProperty(id)) {
			component = this._context[componentName];
			this._renderingContext.renderedIds[id] = true;
		}
	}

	if (!component) {
		return null;
	}

	var innerParserStream = new ComponentTransform(this._context),
		componentContext = Object.create(this._context);

	componentContext.currentComponent = component;
	componentContext.currentAttributes = tagDetails.attributes;

	var componentStream = new ComponentReadable(component, componentContext);
	componentStream.render();

	return componentStream.pipe(innerParserStream);
};