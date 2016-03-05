'use strict';

const path = require('path');

module.exports = {

	/**
	 * Creates an absolute path for the require call.
	 * @param {string} filename The path to the file.
	 * @returns {string} The absolute path to the file.
	 */
	getAbsoluteRequirePath: filename => `${process.cwd()}/${filename}`,

	/**
	 * Clears the Node.js require cache for the specified key.
	 * @param {string} key The cache key.
	 */
	clearCacheKey: key => {
		key = key || '';
		key = key.replace(/\\|\//g, path.sep);
		delete require.cache[key];
	},

	/**
	 * Gets a valid require path replacing all backslashes with slashes.
	 * @param {string} path The path to the file.
	 * @returns {string} The valid require path.
	 */
	getValidPath: path => typeof (path) === 'string' ?
		path.replace(/\\/g, '\\\\') :
		''
};
