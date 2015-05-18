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

module.exports = ServerResponse;

var stream = require('stream'),
	util = require('util');

util.inherits(ServerResponse, stream.Writable);

function ServerResponse() {
	stream.Writable.call(this);
	this.setHeaders = {};
}

ServerResponse.prototype.result = '';
ServerResponse.prototype.status = 200;
ServerResponse.prototype.setHeaders = null;
ServerResponse.prototype.headersSent = false;

ServerResponse.prototype.writeHead = function (code, headers) {
	if (this.headersSent) {
		throw new Error('Headers were sent');
	}
	this.status = code;
	this.setHeaders = headers;
};

ServerResponse.prototype._write = function (chunk, encoding, callback) {
	if (this.isEnded) {
		throw new Error('Write after EOF');
	}
	this.headersSent = true;
	this.result += chunk;
	callback();
};

ServerResponse.prototype.end = function () {
	stream.Writable.prototype.end.apply(this, arguments);
};