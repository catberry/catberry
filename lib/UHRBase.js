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

var ERROR_UNSUPPORTED_PROTOCOL = 'Protocol is unsupported',
	ERROR_PARAMETERS_SHOULD_BE_OBJECT = 'Request parameters should be object',
	ERROR_URL_IS_REQUIRED = 'URL is required parameter',
	ERROR_METHOD_IS_REQUIRED = 'Request method is required parameter',
	ERROR_TIMEOUT_SHOULD_BE_NUMBER = 'Timeout should be a number',
	DEFAULT_TIMEOUT = 30000,
	HTTP_PROTOCOL_REGEXP = /^(http)s?:.+/i;

var METHODS = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	DELETE: 'DELETE'
};

/**
 * Creates new instance of Basic Universal HTTP(S) Request implementation.
 * @constructor
 */
function UHRBase() {

}

/**
 * Does GEt request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.get = function (url, options, callback) {
	var parameters = Object.create(options);
	parameters.method = METHODS.GET;
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
	parameters.method = METHODS.POST;
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
	parameters.method = METHODS.PUT;
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
	parameters.method = METHODS.DELETE;
	parameters.url = url;
	this.request(parameters, callback);
};

/**
 * Does request with specified parameters.
 * @param {Object} parameters Request parameters.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.request = function (parameters, callback) {
	callback = callback || dummy;

	if (typeof(parameters) !== 'object') {
		callback(new Error(ERROR_PARAMETERS_SHOULD_BE_OBJECT));
		return;
	}
	if (!('url' in parameters)) {
		callback(new Error(ERROR_URL_IS_REQUIRED));
		return;
	}
	if (!('method' in parameters)) {
		callback(new Error(ERROR_METHOD_IS_REQUIRED));
		return;
	}

	if (!HTTP_PROTOCOL_REGEXP.test(parameters.url)) {
		callback(new Error(ERROR_UNSUPPORTED_PROTOCOL));
		return;
	}

	parameters.timeout = parameters.timeout || DEFAULT_TIMEOUT;

	if (typeof(parameters.timeout) !== 'number') {
		callback(new Error(ERROR_TIMEOUT_SHOULD_BE_NUMBER));
		return;
	}

	parameters.headers = parameters.headers || {};
	parameters.data = parameters.data || {};

	this._doRequest(parameters, callback);
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