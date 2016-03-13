'use strict';

const stream = require('stream');

class HttpResponse extends stream.PassThrough {
	constructor() {
		super();
		this.headers = {};
		this.code = -1;
	}

	writeHead(code, headers) {
		this.code = code;
		for (const name in headers) {
			if (!headers.hasOwnProperty(name)) {
				continue;
			}

			this.headers[name] = headers[name];
		}
	}
}

module.exports = HttpResponse;
