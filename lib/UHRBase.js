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

module.exports = UHRBase;

var querystring = require('querystring');

var ERROR_UNSUPPORTED_PROTOCOL = 'Protocol is unsupported',
	ERROR_PARAMETERS_SHOULD_BE_OBJECT = 'Request parameters should be object',
	ERROR_URL_IS_REQUIRED = 'URL is required parameter',
	ERROR_METHOD_IS_REQUIRED = 'Request method is required parameter',
	ERROR_TIMEOUT_SHOULD_BE_NUMBER = 'Timeout should be a number',
	DEFAULT_TIMEOUT = 30000,
	HTTP_PROTOCOL_REGEXP = /^(http)s?:.+/i;

UHRBase.METHODS = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	DELETE: 'DELETE'
};

UHRBase.TYPES = {
	URL_ENCODED: 'application/x-www-form-urlencoded',
	JSON: 'application/json',
	PLAIN_TEXT: 'text/plain',
	HTML: 'text/html'
};

UHRBase.CHARSET = 'UTF-8';

UHRBase.DEFAULT_GENERAL_HEADERS = {
	Accept: UHRBase.TYPES.JSON + '; q=0.7, ' +
		UHRBase.TYPES.HTML + '; q=0.2, ' +
		UHRBase.TYPES.PLAIN_TEXT + '; q=0.1',
	Pragma: 'no-cache',
	'Accept-Charset': UHRBase.CHARSET + '; q=1',
	'Cache-Control': 'no-cache',
	'X-Requested-With': 'Catberry UHR'
};

UHRBase.CHARSET_PARAMETER = '; charset=' + UHRBase.CHARSET;
UHRBase.URL_ENCODED_ENTITY_CONTENT_TYPE = UHRBase.TYPES.URL_ENCODED +
	UHRBase.CHARSET_PARAMETER;

UHRBase.JSON_ENTITY_CONTENT_TYPE = UHRBase.TYPES.JSON +
	UHRBase.CHARSET_PARAMETER;

UHRBase.PLAIN_TEXT_ENTITY_CONTENT_TYPE = UHRBase.TYPES.PLAIN_TEXT +
	UHRBase.CHARSET_PARAMETER;

// This module were developed using HTTP/1.1v2 RFC 2616
// (http://www.w3.org/Protocols/rfc2616/)
/**
 * Creates new instance of Basic Universal HTTP(S) Request implementation.
 * @constructor
 */
function UHRBase() {

}

/**
 * Does GET request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.get = function (url, options, callback) {
	var parameters = Object.create(options);
	parameters.method = UHRBase.METHODS.GET;
	parameters.url = url;
	this.request(parameters, callback);
};

/**
 * Does POST request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Request options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.post = function (url, options, callback) {
	var parameters = Object.create(options);
	parameters.method = UHRBase.METHODS.POST;
	parameters.url = url;
	this.request(parameters, callback);
};

/**
 * Does PUT request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.put = function (url, options, callback) {
	var parameters = Object.create(options);
	parameters.method = UHRBase.METHODS.PUT;
	parameters.url = url;
	this.request(parameters, callback);
};

/**
 * Does DELETE request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.delete = function (url, options, callback) {
	var parameters = Object.create(options);
	parameters.method = UHRBase.METHODS.DELETE;
	parameters.url = url;
	this.request(parameters, callback);
};

/**
 * Does request with specified parameters.
 * @param {Object} parameters Request parameters.
 * @param {Function?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.request = function (parameters, callback) {
	callback = callback || dummy;
	if (!this._validateRequest(parameters, callback)) {
		return;
	}
	if (parameters.method === UHRBase.METHODS.GET ||
		parameters.method === UHRBase.METHODS.DELETE) {
		parameters.data = querystring.stringify(parameters.data);
	} else {
		parameters.data = this._getDataToSend(parameters);
	}
	this._doRequest(parameters, callback);
};

/**
 * Validates UHR parameters.
 * @param {Object} parameters UHR parameters.
 * @param {Function} callback Callback on finish.
 * @private
 */
UHRBase.prototype._validateRequest = function (parameters, callback) {
	if (typeof(parameters) !== 'object') {
		callback(new Error(ERROR_PARAMETERS_SHOULD_BE_OBJECT));
		return false;
	}
	if (!('url' in parameters)) {
		callback(new Error(ERROR_URL_IS_REQUIRED));
		return false;
	}
	if (!('method' in parameters) || !(parameters.method in UHRBase.METHODS)) {
		callback(new Error(ERROR_METHOD_IS_REQUIRED));
		return false;
	}

	if (!HTTP_PROTOCOL_REGEXP.test(parameters.url)) {
		callback(new Error(ERROR_UNSUPPORTED_PROTOCOL));
		return false;
	}

	parameters.timeout = parameters.timeout || DEFAULT_TIMEOUT;

	if (typeof(parameters.timeout) !== 'number') {
		callback(new Error(ERROR_TIMEOUT_SHOULD_BE_NUMBER));
		return false;
	}
	parameters.headers = parameters.headers || {};
	parameters.data = parameters.data || {};
	return true;
};

/**
 * Gets data for sending via HTTP request using Content Type HTTP header.
 * @param {Object} parameters UHR parameters.
 * @returns {string}
 * @private
 */
UHRBase.prototype._getDataToSend = function (parameters) {
	if (!parameters.headers['Content-Type']) {
		if (typeof(parameters.data) === 'object') {
			parameters.headers['Content-Type'] =
				UHRBase.URL_ENCODED_ENTITY_CONTENT_TYPE;
		} else {
			parameters.data = String(parameters.data || '');
			parameters.headers['Content-Type'] =
				UHRBase.PLAIN_TEXT_ENTITY_CONTENT_TYPE;
		}
	}

	var typeAndParameters = parameters
			.headers['Content-Type']
			.split(';'),
		type = String(typeAndParameters[0])
			.toLowerCase();

	switch (type) {
		case UHRBase.TYPES.URL_ENCODED:
			return querystring.stringify(parameters.data).replace('%20', '+');
		case UHRBase.TYPES.JSON:
			return JSON.stringify(parameters.data);
		default:
			return String(parameters.data);
	}
};

/**
 * Creates HTTP headers for request using defaults and current parameters.
 * @param {Object} parameterHeaders HTTP headers of UHR.
 * @protected
 */
UHRBase.prototype._createHeaders = function (parameterHeaders) {
	var headers = {};

	Object.keys(UHRBase.DEFAULT_GENERAL_HEADERS)
		.forEach(function (headerName) {
			headers[headerName] = UHRBase.DEFAULT_GENERAL_HEADERS[headerName];
		});

	Object.keys(parameterHeaders)
		.forEach(function (headerName) {
			headers[headerName] = parameterHeaders[headerName];
		});

	return headers;
};

/**
 * Does request with specified parameters using protocol implementation.
 * @param {Object} parameters Request parameters.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 * @protected
 * @abstract
 */
UHRBase.prototype._doRequest = function (parameters, callback) {

};

/**
 * Does nothing as default callback.
 */
function dummy() {}