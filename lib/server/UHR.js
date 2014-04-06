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
	UHRBase = require('../UHRBase');

util.inherits(UHR, UHRBase);

var METHODS = {
	GET: 'GET',
	POST: 'POST',
	PUT: 'PUT',
	DELETE: 'DELETE'
};

function UHR() {
	UHRBase.call(this);
}

UHR.prototype._doRequest = function (parameters, callback) {
	var urlInfo = url.parse(parameters.url),
		protocol = urlInfo.protocol === 'http:' ? http : https,
		requestOptions = {
			host: urlInfo.host,
			hostname: urlInfo.hostname,
			port: urlInfo.port,
			method: parameters.method,
			path: urlInfo.path,
			headers: parameters.headers,
			auth: urlInfo.auth
		};

	if (parameters.method === METHODS.GET ||
		parameters.method === METHODS.DELETE) {
		var queryString = buildQueryString(parameters.data);

		if (queryString.length > 0) {
			requestOptions.path +=
				(!urlInfo.search || urlInfo.search.length === 0 ? '?' : '&') +
				queryString;
		}
	}

	var request = protocol.request(requestOptions, function (response) {
		response.setEncoding('utf8');

		var data = '';
		response
			.on('data', function (chunk) {
				data += chunk;
			})
			.on('error', function (error) {
				callback(error, getStatusObject(response));
			})
			.on('end', function () {
				callback(null, getStatusObject(response), data);
			});
	});

	request.setTimeout(parameters.timeout);

	request.on('error', function (error) {
		callback(error);
	});

	if (parameters.method === METHODS.POST ||
		parameters.method === METHODS.PUT) {

		var data = typeof(parameters.data) === 'string' ?
			parameters.data :
			JSON.stringify(parameters.data);

		request.write(data);
	}

	request.end();
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

/**
 * Builds query string from query parameters in object.
 * @param {Object} object Query object.
 * @returns {string}
 */
function buildQueryString(object) {
	var string = '';

	if (typeof(object) !== 'object') {
		return string;
	}
	Object.keys(object)
		.forEach(function (queryParameterName) {
			if (string.length !== 0) {
				string += '&';
			}

			string += queryParameterName + '=' +
				encodeURIComponent(object[queryParameterName].toString());
		});

	return string;
}