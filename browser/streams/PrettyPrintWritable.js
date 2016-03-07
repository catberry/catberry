'use strict';

const stream = require('stream');

/* eslint no-console: 0 */
class PrettyPrintWritable extends stream.Writable {

	/**
	 * Creates a new stream for writing log messages.
	 */
	constructor() {
		super({
			objectMode: true
		});

		this.on('error', error => console.error(error));
	}

	/**
	 * Writes the next log message to the console.
	 * @param {string} chunk The next message.
	 * @param {string} encoding Encoding.
	 * @param {function} callback The callback to continue pushing.
	 * @private
	 */
	_write(chunk, encoding, callback) {
		const object = JSON.parse(chunk);

		if (object.level >= 50) {
			console.error(`${object.err.name}: ${object.err.message}\n${object.err.stack}`);
		} else if (object.level >= 40) {
			console.warn(object.msg);
		} else if (object.level >= 30) {
			console.info(object.msg);
		} else {
			console.log(object.msg);
		}

		callback();
	}
}

module.exports = PrettyPrintWritable;
