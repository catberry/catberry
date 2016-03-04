'use strict';

const LEVELS = {
	DEBUG: 'debug',
	TRACE: 'trace',
	INFO: 'info',
	WARN: 'warn',
	ERROR: 'error',
	FATAL: 'fatal'
};

/* eslint no-console: 0 */
class Logger {

	/**
	 * Creates a new instance of the browser logger.
	 * @param {Object|string} levels Levels to log.
	 */
	constructor(levels) {

		/**
		 * Current levels of logging.
		 * @type {Object}
		 * @private
		 */
		this._levels = {
			debug: true,
			trace: true,
			info: true,
			warn: true,
			error: true,
			fatal: true
		};

		if (typeof (levels) === 'object') {
			this._levels = levels;
		}

		if (typeof (levels) === 'string') {
			this._levels = {};
			Object.keys(LEVELS)
				.forEach(level => {
					this._levels[LEVELS[level]] = (levels.search(LEVELS[level]) !== -1);
				});
		}
	}

	/**
	 * Logs a trace message.
	 * @param {string} message Trace message.
	 */
	trace(message) {
		if (!this._levels.trace) {
			return;
		}

		if (console.log) {
			console.log(message);
		}
	}

	/**
	 * Logs a trace message.
	 * @param {string} message Trace message.
	 */
	debug(message) {
		if (!this._levels.debug) {
			return;
		}

		if (console.log) {
			console.log(message);
		}
	}

	/**
	 * Logs a info message.
	 * @param {string} message Information message.
	 */
	info(message) {
		if (!this._levels.info) {
			return;
		}

		if (console.info) {
			console.info(message);
		}
	}

	/**
	 * Logs a warn message.
	 * @param {string} message Warning message.
	 */
	warn(message) {
		if (!this._levels.warn) {
			return;
		}

		if (console.warn) {
			console.warn(message);
		}
	}

	/**
	 * Logs an error message.
	 * @param {string|Error} error Error object or message.
	 */
	error(error) {
		if (!this._levels.error) {
			return;
		}

		writeError(error);
	}

	/**
	 * Logs an error message.
	 * @param {string|Error} error Error object or message.
	 */
	fatal(error) {
		if (!this._levels.fatal) {
			return;
		}
		writeError(error);
	}
}

/**
 * Writes an error to the console.
 * @param {Error|string} error Error to write.
 */
function writeError(error) {
	try {
		if (!(error instanceof Error)) {
			error = typeof (error) === 'string' ? new Error(error) : new Error();
		}
		if (console.error) {
			console.error(error);
		}
	} catch (e) {
		writeError(e);
	}
}

module.exports = Logger;
