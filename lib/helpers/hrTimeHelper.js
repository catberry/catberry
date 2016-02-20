'use strict';

module.exports = {

	/**
	 * Gets the high resolution time or the difference between
	 * previous and current time.
	 * @param {Array?} Previous high resolution timestamp.
	 * @returns {Array} The high resolution time tuple.
	 */
	get: process.hrtime,

	/**
	 * Converts the high resolution timestamp to the text message.
	 * @param {Array} The high resolution time tuple.
	 * @returns {string} Time message.
	 */
	toMessage: require('pretty-hrtime'),

	/**
	 * Converts high resolution time to milliseconds number.
	 * @param {Array} hrTime The high resolution time tuple.
	 */
	toMilliseconds: hrTime => {
		return hrTime[0] * 1e3 + Math.round(hrTime[1] / 1e6);
	}
};
