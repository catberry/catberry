'use strict';

module.exports = {

	/**
	 * Converts a method with a callback to the method that returns a promise.
	 * @param {Function} methodWithCallback The method with a callback.
	 * @returns {Function} The method that returns a promise.
	 */
	callbackToPromise: methodWithCallback => {

		/* eslint prefer-rest-params:0 */
		/* eslint no-invalid-this:0 */
		// TODO rewrite this when Spread operator and Rest parameters will be supported
		return function() {
			const args = Array.prototype.slice.call(arguments);
			return new Promise((fulfill, reject) => {
				args.push((error, result) => {
					if (error) {
						reject(error);
						return;
					}
					fulfill(result);
				});
				methodWithCallback.apply(this, args);
			});
		};
	}
};
