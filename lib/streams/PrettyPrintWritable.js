'use strict';

const stream = require('stream');
const chalk = require('chalk');

const LOG_LEVELS = {
	60: 'FATAL',
	50: 'ERROR',
	40: 'WARN ',
	30: 'INFO ',
	20: 'DEBUG',
	10: 'TRACE'
};

const LEVEL_STYLES = {
	60: ['white', 'bgRed', 'bold'],
	50: ['white', 'bgRed'],
	40: ['black', 'bgYellow'],
	30: ['black', 'bgCyan'],
	20: ['black', 'bgWhite'],
	10: ['grey', 'bgBlack']
};

class PrettyPrintWritable extends stream.Writable {

	/**
	 * Creates a new stream for writing log messages.
	 */
	constructor() {
		super({
			objectMode: true
		});

		/* eslint no-console: 0 */
		this.on('error', error => console.error(error));

		/**
		 * Current styling functions for each level.
		 * @type {Object}
		 * @private
		 */
		this._cachedStyling = this._getStylings();
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
		const prefix = this._buildPrefix(object);
		var msg, writeStream;

		if (object.level > 40) {
			msg = `${prefix} – ${object.err.stack}\n\n`;
			writeStream = process.stderr;
		} else {
			msg = `${prefix} – ${object.msg}\n`;
			writeStream = process.stdout;
		}

		writeStream.write(msg);
		callback();
	}

	/**
	 * Builds a prefix for the message object.
	 * @param {Object} object The message object.
	 * @returns {string} The prefix string for the message.
	 * @private
	 */
	_buildPrefix(object) {
		return this._cachedStyling[object.level](
			`[${object.time}] [${LOG_LEVELS[object.level]}] [${object.name}:${object.pid}]`
		);
	}

	/**
	 * Gets a styling function for the specified level.
	 * @returns {Object} Styling functions for every level.
	 * @private
	 */
	_getStylings() {
		const stylings = Object.create(null);
		Object.keys(LEVEL_STYLES)
			.forEach(level => {
				let styling = chalk;
				for (let i = 0; i < LEVEL_STYLES[level].length; i++) {
					styling = styling[LEVEL_STYLES[level][i]];
				}
				stylings[level] = styling;
			});

		return stylings;
	}
}

module.exports = PrettyPrintWritable;
