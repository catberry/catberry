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

module.exports = ChatServiceClient;

var http = require('http');

/**
 * Creates new instance of server-side chat service client.
 * @param {string} chatHost Host name of chat service.
 * @param {number} chatHostPort Port number of chat service.
 * @constructor
 */
function ChatServiceClient(chatHost, chatHostPort) {
	this._chatHost = chatHost;
	this._chatHostPort = chatHostPort;
}

/**
 * Current chat host name.
 * @type {string}
 * @private
 */
ChatServiceClient.prototype._chatHost = null;

/**
 * Current chat host port number.
 * @type {number}
 * @private
 */
ChatServiceClient.prototype._chatHostPort = null;

/**
 * Gets messages of chat.
 * @param {string} cookieString Cookie string to identify user.
 * @param {number} limit Limit of receiving messages not greater than 100.
 * @param {Function?} callback Callback on finish.
 */
ChatServiceClient.prototype.getMessages =
	function (cookieString, limit, callback) {
		callback = callback || dummy;
		var requestOptions = {
			host: this._chatHost,
			port: this._chatHostPort,
			path: '/chatApi/get?limit=' + limit,
			headers: {
				'Cookie': cookieString
			}
		};
		http.request(requestOptions)
			.on('error', callback)
			.on('response', function (response) {
				response.setEncoding('utf8');
				var data = '';
				response.on('error', callback);
				response.on('data', function (chunk) {
					data += chunk;
				});
				response.on('end', function () {
					var messages;
					try {
						messages = JSON.parse(data);
					} catch (e) {
						messages = {messages: []};
					}
					callback(null, messages);
				});
			})
			.end();
	};

/**
 * Gets user nickname.
 * @param {string} cookieString Cookie string to identify user.
 * @param {Function?} callback Callback on finish.
 */
ChatServiceClient.prototype.whoAmI =
	function (cookieString, callback) {
		callback = callback || dummy;
		var requestOptions = {
			host: this._chatHost,
			port: this._chatHostPort,
			path: '/chatApi/whoami',
			headers: {
				Cookie: cookieString
			}
		};
		http.request(requestOptions)
			.on('error', callback)
			.on('response', function (response) {
				response.setEncoding('utf8');
				var data = '';
				response.on('error', callback);
				response.on('data', function (chunk) {
					data += chunk;
				});
				response.on('end', function () {
					callback(null, data);
				});
			})
			.end();
	};

/**
 * Does nothing as default callback.
 */
function dummy() {}