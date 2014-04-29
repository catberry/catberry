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

module.exports = UHR;

var UHRBase = require('../UHRBase'),
	util = require('util');

util.inherits(UHR, UHRBase);

var NON_SAFE_HEADERS = {
	cookie: true,
	'accept-charset': true
};

/**
 * Creates new instance of client-side HTTP(S) request implementation.
 * @param {jQuery} $jQuery jQuery library to use AJAX.
 * @constructor
 */
function UHR($jQuery) {
	UHRBase.call(this);
	this.$ = $jQuery;
}

/**
 * Current instance of jQuery.
 * @type {jQuery}
 */
UHR.prototype.$ = null;

/**
 * Does request with specified parameters using protocol implementation.
 * @param {Object} parameters Request parameters.
 * @param {Function} callback Callback on finish.
 * @protected
 */
UHR.prototype._doRequest = function (parameters, callback) {
	try {
		var ajaxParameters = Object.create(parameters);
		ajaxParameters.headers = this._createHeaders(parameters.headers);
		ajaxParameters.type = parameters.method;

		if (parameters.headers['Content-Type']) {
			ajaxParameters.contentType = parameters.headers['Content-Type'];
		}

		Object.keys(ajaxParameters.headers)
			.forEach(function (name) {
				if (NON_SAFE_HEADERS.hasOwnProperty(name.toLowerCase())) {
					delete ajaxParameters.headers[name];
				}
			});

		this.$.ajax(ajaxParameters)
			.done(function (data, textStatus, jqXHR) {
				callback(null, getStatusObject(jqXHR), data);
			})
			.fail(function (jqXHR, textStatus, errorThrown) {
				callback(errorThrown, getStatusObject(jqXHR));
			});

	} catch (e) {
		callback(e);
	}
};

/**
 * Gets state object for specified jQuery XHR object.
 * @param {Object} jqXHR jQuery XHR object.
 * @returns {{code: number, text: string, headers: Object}} Status object.
 */
function getStatusObject(jqXHR) {
	var headers = {};

	jqXHR
		.getAllResponseHeaders()
		.split('\n')
		.forEach(function (header) {
			var delimiterIndex = header.indexOf(':');
			if (delimiterIndex <= 0) {
				return;
			}
			var headerName = header
				.substring(0, delimiterIndex)
				.trim()
				.toLowerCase();
			headers[headerName] = header
				.substring(delimiterIndex + 1)
				.trim();
		});

	return {
		code: jqXHR.status,
		text: jqXHR.statusText,
		headers: headers
	};
}