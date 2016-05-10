'use strict';

const PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/;

module.exports = {

	/**
	 * Removes a slash from the end of the URI path.
	 * @param {string} uriPath The URI path.
	 * @returns {string} The URI without a slash at the end.
	 */
	removeEndSlash(uriPath) {
		if (!uriPath || typeof (uriPath) !== 'string') {
			return '';
		}
		if (uriPath === '/') {
			return uriPath;
		}
		return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
	}
};
