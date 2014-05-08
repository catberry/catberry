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

var url = require('url'),
	util = require('util'),
	http = require('http'),
	https = require('https'),
	querystring = require('querystring'),
	zlib = require('zlib'),
	UHRBase = require('../UHRBase');

util.inherits(UHR, UHRBase);

var ENCODINGS = {
	GZIP: 'gzip',
	DEFLATE: 'deflate',
	IDENTITY: 'identity'
};

var ERROR_REQUEST_TIMEOUT = 'Request timeout',
	USER_AGENT = 'CatberryUHR',
	ACCEPT_ENCODING = ENCODINGS.GZIP + '; q=0.7, ' +
		ENCODINGS.DEFLATE + '; q=0.2, ' +
		ENCODINGS.IDENTITY + '; q=0.1';

// This module were developed using HTTP/1.1v2 RFC 2616
// (http://www.w3.org/Protocols/rfc2616/)
/**
 * Creates new instance of server-side HTTP(S) request implementation.
 * @constructor
 */
function UHR() {
	UHRBase.call(this);
}

/**
 * Does request with specified parameters using protocol implementation.
 * @param {Object} parameters Request parameters.
 * @param {Function?} callback Callback on finish
 * with error, status object and data.
 * @protected
 */
UHR.prototype._doRequest = function (parameters, callback) {
	var self = this,
		urlInfo = url.parse(parameters.url),
		protocol = urlInfo.protocol === 'http:' ? http : https,
		requestOptions = {
			method: parameters.method,
			headers: this._createHeaders(parameters.headers),
			path: urlInfo.path,
			host: urlInfo.host,
			hostname: urlInfo.hostname,
			port: urlInfo.port,
			auth: urlInfo.auth,
			rejectUnauthorized: ('unsafeHTTPS' in parameters) ?
				!Boolean(parameters.unsafeHTTPS)
				: true
		};

	// RFC 2616 14.23. This header is required
	requestOptions.headers.Host = urlInfo.host;

	if (parameters.data.length > 0 && (
		requestOptions.method === UHRBase.METHODS.GET ||
		requestOptions.method === UHRBase.METHODS.DELETE)) {
		requestOptions.path +=
			(!urlInfo.search || urlInfo.search.length === 0 ? '?' : '&') +
			parameters.data;
	}

	var request = protocol.request(requestOptions, function (response) {
		self._processResponse(response, callback);
	});

	request.setTimeout(parameters.timeout, function () {
		request.end();
		callback(new Error(ERROR_REQUEST_TIMEOUT));
	});
	request.on('error', function (error) {
		callback(error);
	});

	if (parameters.method === UHRBase.METHODS.POST ||
		parameters.method === UHRBase.METHODS.PUT) {
		request.write(parameters.data);
	}

	request.end();
};

/**
 * Processes response from server.
 * @param {ServerResponse} response HTTP response.
 * @param {Function} callback Callback on finish.
 * @private
 */
UHR.prototype._processResponse = function (response, callback) {
	var headers = response.headers || {},
		encoding = headers['content-encoding'],
		responseData = '',
		responseStream;

	switch (encoding) {
		case ENCODINGS.GZIP:
			responseStream = response.pipe(zlib.createGunzip());
			break;
		case ENCODINGS.DEFLATE:
			responseStream = response.pipe(zlib.createInflate());
			break;
		default :
			responseStream = response;
	}

	responseStream.setEncoding('utf8');
	responseStream
		.on('data', function (chunk) {
			responseData += chunk;
		})
		.on('error', function (error) {
			callback(error, getStatusObject(response));
		})
		.on('end', function () {
			var statusObject = getStatusObject(response),
				contentType = headers['content-type'] || '',
				typeAndParameters = contentType
					.split(';'),
				type = String(typeAndParameters[0]).toLowerCase();

			switch (type) {
				case UHRBase.TYPES.JSON:
					try {
						var json = JSON.parse(responseData);
						callback(null, statusObject, json);
					} catch (e) {
						callback(e, statusObject);
					}
					return;
				case UHRBase.TYPES.URL_ENCODED:
					try {
						var object = querystring.parse(responseData);
						callback(null, statusObject, object);
					} catch (e) {
						callback(e, statusObject);
					}
					return;
				default:
					callback(null, statusObject, responseData);
			}
		});
};

/**
 * Creates HTTP headers for current UHR.
 * @param {Object} parameterHeaders HTTP headers from UHR parameters.
 * @returns {Object} HTTP headers for UHR.
 * @private
 */
UHR.prototype._createHeaders = function (parameterHeaders) {
	var headers = {
		'Accept-Encoding': ACCEPT_ENCODING,
		'User-Agent': USER_AGENT
	};
	Object.keys(parameterHeaders)
		.forEach(function (headerName) {
			headers[headerName] = parameterHeaders[headerName];
		});

	return UHRBase.prototype._createHeaders(headers);
};

/**
 * Gets status object from HTTP(S) response.
 * @param {ServerResponse} response HTTP(S) response.
 * @returns {{code: number, text: string, headers: Object}} Status object.
 */
function getStatusObject(response) {
	return {
		code: response.statusCode,
		text: http.STATUS_CODES[response.statusCode],
		headers: response.headers
	};
}