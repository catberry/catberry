'use strict';

module.exports = {

	/**
	 * Gets the high resolution time or the difference between
	 * previous and current time.
	 * @param {Array?} Previous high resolution timestamp.
	 * @returns {Array} The high resolution time.
	 */
	get: require('browser-process-hrtime'),

	/**
	 * Converts the high resolution timestamp to text message.
	 * @param {Array}
	 * @returns {string} Time message.
	 */
	toMessage: require('pretty-hrtime'),

	/**
	 * Converts high resolution time to milliseconds number.
	 * @param {Array} hrTime High resolution time tuple.
	 */
	toMilliseconds: hrTime => hrTime[0] * 1e3 + Math.round(hrTime[1] / 1e6)
};
