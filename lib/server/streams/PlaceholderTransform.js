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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = PlaceholderTransform;

var ModuleReadable = require('./ModuleReadable'),
	events = require('events'),
	util = require('util'),
	stream = require('stream'),
	sax = require('sax');

var OPEN_TAG_FORMAT = '<%s%s%s>',
	CLOSE_TAG_FORMAT = '</%s>',
	DOC_TYPE_FORMAT = '<!DOCTYPE %s>',
	ATTRIBUTE_FORMAT = '%s="%s"',
	TAG_CLOSE_SLASH = ' /',
	ID_ATTRIBUTE_NAME = 'id',
	SAX_CONFIG = {
		lowercase: true,
		trim: true
	};

util.inherits(PlaceholderTransform, stream.Duplex);

/**
 * Creates new instance of placeholder transformation stream.
 * @param {Object} context Rendering context.
 * @constructor
 */
function PlaceholderTransform(context) {
	stream.Duplex.call(this);

	this._renderedPlaceholders = {};
	this._tokenQueue = [];
	this._context = context;
	this._parserStream = sax.createStream(false, SAX_CONFIG);
	this._wrapParser(this._parserStream, this._tokenQueue);
}

/**
 * Set of placeholder ids which were already rendered.
 * @type {Object}
 * @private
 */
PlaceholderTransform.prototype._renderedPlaceholders = null;

/**
 * Current rendering context.
 * @type {Object}
 * @private
 */
PlaceholderTransform.prototype._context = null;

/**
 * Current parser stream.
 * @type {SAXStream}
 * @private
 */
PlaceholderTransform.prototype._parserStream = null;

/**
 * If true current stream processing is over.
 * @type {boolean}
 * @private
 */
PlaceholderTransform.prototype._ended = false;

/**
 * Current state of placeholder rendering.
 * @type {boolean}
 * @private
 */
PlaceholderTransform.prototype._renderingPlaceholder = false;

/**
 * Current name of last self closed HTML tag.
 * @type {string}
 * @private
 */
PlaceholderTransform.prototype._lastClosedName = '';

/**
 * Current token queue.
 * @type {Array}
 * @private
 */
PlaceholderTransform.prototype._tokenQueue = null;

/**
 * Wraps parser with required events.
 * @param {SAXStream} parser Parser stream.
 * @param {Array} tokenQueue Queue of tokens.
 * @private
 */
PlaceholderTransform.prototype._wrapParser = function (parser, tokenQueue) {
	var self = this;

	parser.on('error', this._errorHandler.bind(this));
	parser.on('opentag', function (element) {
		tokenQueue.push({
			type: 'opentag',
			token: element
		});
		if (parser === self._parserStream) {
			self.read(0);
		}
	});

	parser.on('closetag', function (name) {
		tokenQueue.push({
			type: 'closetag',
			token: name
		});
		if (parser === self._parserStream) {
			self.read(0);
		}
	});

	parser.on('text', function (text) {
		tokenQueue.push({
			type: 'text',
			token: text
		});
		if (parser === self._parserStream) {
			self.read(0);
		}
	});

	parser.on('doctype', function (doctype) {
		tokenQueue.push({
			type: 'doctype',
			token: doctype
		});
		if (parser === self._parserStream) {
			self.read(0);
		}
	});
};

/**
 * Reads next token from token queue and render placeholder if required.
 * @private
 */
PlaceholderTransform.prototype._read = function () {
	var self = this;

	if (this._renderingPlaceholder) {
		this.once('renderedPlaceholder', function () {
			self.push('');
			self.read(0);
		});
		return;
	}

	if (this._ended && this._tokenQueue.length === 0) {
		this._parserStream.end();
		this.push(null);
		return;
	}

	if (this._tokenQueue.length === 0) {
		this.push('');
		this.emit('queueIsEmpty');
		return;
	}

	var tokenItem = this._tokenQueue.shift();

	switch (tokenItem.type) {
		case 'opentag':
			this._renderingPlaceholder = true;
			this._openTagHandler(tokenItem.token,
				function (chunk) {
					self.push(chunk);
				},
				function (tokens) {
					if (tokens && tokens.length > 0) {
						self._tokenQueue = tokens.concat(self._tokenQueue);
					}
					self._renderingPlaceholder = false;
					self.emit('renderedPlaceholder');
				});
			break;
		case 'closetag':
			if (this._lastClosedName === tokenItem.token) {
				this.push('');
			} else {
				var closeTag = buildCloseTag(tokenItem.token);
				this.push(closeTag);
			}
			break;
		case 'doctype':
			var docType = buildDocType(tokenItem.token);
			this.push(docType);
			break;
		case 'text':
			this.push(tokenItem.token);
			break;
	}
};

/**
 * Ends processing of stream.
 */
PlaceholderTransform.prototype.end = function () {
	stream.Duplex.prototype.end.call(this);
	this._ended = true;
	this._parserStream.end();
	this.read(0);
};

/**
 * Writes chunk to SAX parser.
 * @param {Buffer|string} chunk Chunk to write.
 * @param {string} encoding Encoding.
 * @param {Function} callback Callback to say 'ready for next chunk'.
 * @private
 */
PlaceholderTransform.prototype._write = function (chunk, encoding, callback) {
	this._parserStream.write(chunk);
	this.once('queueIsEmpty', function () {
		callback();
	});
};

/**
 * Recognizes if need to render some placeholder inside HTML element.
 * @param {Object} element SAX element object.
 * @returns {boolean}
 * @private
 */
PlaceholderTransform.prototype._isNeedRendering = function (element) {
	return !element.selfClosing &&
		element.attributes.hasOwnProperty(ID_ATTRIBUTE_NAME) &&
		this._context.placeholdersByIds.hasOwnProperty(element.attributes.id) &&
		!this._renderedPlaceholders.hasOwnProperty(element.attributes.id);
};

/**
 * Handles HTML open tag.
 * @param {Object} element SAX element object.
 * @param {Function} pipe Method to pipe chunks to output.
 * @param {Function} next Next function which receives inner token queue.
 * @private
 */
PlaceholderTransform.prototype._openTagHandler =
	function (element, pipe, next) {
		if (!this._isNeedRendering(element)) {
			var passOpenTag = buildOpenTag(element.name,
				element.attributes, element.isSelfClosing);

			if (element.isSelfClosing) {
				this._lastClosedName = element.name;
			}

			pipe(passOpenTag);
			next();
			return;
		}

		if (this._lastClosedName == element.name) {
			this._lastClosedName = '';
		}
		var openTag = buildOpenTag(element.name, element.attributes, false);
		pipe(openTag);

		this._renderedPlaceholders[element.attributes.id] = true;

		var placeholder = this._context.placeholdersByIds[element.attributes.id],
			moduleName = placeholder.moduleName,
			module = this._context.modulesByNames[moduleName],
			innerParser = sax.createStream(false, SAX_CONFIG),
			innerTokenQueue = [];

		var moduleStream = new ModuleReadable(module, placeholder,
			this._context.parameters);

		moduleStream.on('error', this._errorHandler.bind(this));
		innerParser.on('error', this._errorHandler.bind(this));
		this._wrapParser(innerParser, innerTokenQueue);
		moduleStream.pipe(innerParser);
		moduleStream.on('end', function () {
			innerParser.end();
			next(innerTokenQueue);
		});
		moduleStream.render();
	};

/**
 * Handles specified error.
 * @param {Error} error Error object.
 * @private
 */
PlaceholderTransform.prototype._errorHandler = function (error) {
	this.emit('error', error);
};

/**
 * Builds HTML open tag.
 * @param {string} name HTML element name.
 * @param {Object} attributes Set of element attributes.
 * @param {boolean} isSelfClosing True of tag closes itself.
 * @returns {string} HTML open tag.
 */
function buildOpenTag(name, attributes, isSelfClosing) {
	var attributesString = '';

	for (var attributeName in attributes) {
		if (!attributes.hasOwnProperty(attributeName)) {
			continue;
		}

		attributesString += ' ';
		attributesString +=
			buildAttribute(attributeName, attributes[attributeName]);
	}

	return util.format(OPEN_TAG_FORMAT, name, attributesString,
		isSelfClosing ? TAG_CLOSE_SLASH : '');
}

/**
 * Builds HTML close tag.
 * @param {string} name HTML element name.
 * @returns {string} HTML close tag.
 */
function buildCloseTag(name) {
	return util.format(CLOSE_TAG_FORMAT, name);
}

/**
 * Builds DOCTYPE HTML entity.
 * @param {string} name Document type name.
 * @returns {string} HTML document type entity.
 */
function buildDocType(name) {
	return util.format(DOC_TYPE_FORMAT, name.trim());
}

/**
 * Builds HTML attribute.
 * @param {string} name Attribute name.
 * @param {string} value Attribute value.
 * @returns {string} HTML attribute representation.
 */
function buildAttribute(name, value) {
	return util.format(ATTRIBUTE_FORMAT, name, value);
}