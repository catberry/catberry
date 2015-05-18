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

module.exports = ResponseTransform;

var util = require('util'),
	stream = require('stream');

util.inherits(ResponseTransform, stream.Transform);

var CONTENT_TYPE = 'text/html; charset=utf-8',
	POWERED_BY = 'Catberry';

/**
 * Creates new instance of response proxy stream.
 * @param {Object} renderingContext Context of rendering.
 * @param {Object?} options Stream options.
 * @constructor
 */
function ResponseTransform(renderingContext, options) {
	stream.Transform.call(this, options);
	this._renderingContext = renderingContext;
	this._response = renderingContext.routingContext.middleware.response;
	this.pipe(this._response);
}

/**
 * Current context of rendering.
 * @type {Object}
 * @private
 */
ResponseTransform.prototype._renderingContext = null;

/**
 * Current HTML buffer.
 * @type {Buffer|null}
 * @private
 */
ResponseTransform.prototype._html = null;

/**
 * Writes a chunk of data.
 * @param {Buffer} data Chunk of data.
 * @param {String} encoding Chunk encoding.
 * @param {Function} callback Callback on ready to continue state.
 * @private
 */
ResponseTransform.prototype._transform =
	function (data, encoding, callback) {
		if (this._renderingContext.isCanceled) {
			return;
		}

		if (this._renderingContext.isReadyToFlush) {
			this._initializeResponse();
			if (!this._renderingContext.isCanceled) {
				this.push(data);
				callback();
			}
			return;
		}

		// otherwise accumulate the stream
		if (!this._html) {
			this._html = data;
		} else {
			this._html = Buffer.concat([this._html, data]);
		}

		callback();
	};

/**
 * Ends the stream.
 * @param {Function} callback Callback on finished state.
 */
ResponseTransform.prototype._flush = function (callback) {
	this._initializeResponse();
	callback();
};

/**
 * Sets HTTP headers to the response and sends the first part of data.
 * @private
 */
ResponseTransform.prototype._initializeResponse = function () {
	if (this._renderingContext.isFlushed) {
		return;
	}
	this._renderingContext.isFlushed = true;
	var context = this._renderingContext.routingContext;
	if (context.actions.redirectedTo) {
		this._response.writeHead(302, {
			Location: context.actions.redirectedTo
		});
		this.unpipe(this._response);
		this._response.end();
		context.actions.redirectedTo = '';
		this._renderingContext.isCanceled = true;
		return;
	}

	if (context.actions.isNotFoundCalled) {
		context.actions.isNotFoundCalled = false;
		this._renderingContext.isCanceled = true;
		this.unpipe(this._response);
		context.middleware.next();
		return;
	}

	var headers = {
		'Content-Type': CONTENT_TYPE,
		'X-Powered-By': POWERED_BY
	};
	if (context.cookie.setCookie.length > 0) {
		headers['Set-Cookie'] = context.cookie.setCookie;
	}
	this._response.writeHead(200, headers);
	context.cookie.setCookie = [];

	if (this._html) {
		this.push(this._html);
	}
};