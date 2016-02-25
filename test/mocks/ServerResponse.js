'use strict';

const stream = require('stream');

class ServerResponse extends stream.Writable {
	constructor() {
		super();
		this.setHeaders = {};

		this.result = '';
		this.status = 200;
		this.headersSent = false;
	}

	writeHead(code, headers) {
		if (this.headersSent) {
			throw new Error('Headers were sent');
		}
		this.status = code;
		this.setHeaders = headers;
	}

	_write(chunk, encoding, callback) {
		if (this.isEnded) {
			throw new Error('Write after EOF');
		}
		this.headersSent = true;
		this.result += chunk;
		callback();
	}

	end(chunk) {
		super.end(chunk);
	}
}

module.exports = ServerResponse;
