'use strict';

module.exports = {

	/**
	 * Converts a method with a callback to the method that returns a promise.
	 * @param {Function} methodWithCallback The method with a callback.
	 * @returns {Function} The method that returns a promise.
	 */
	callbackToPromise: methodWithCallback => {

		/* eslint no-invalid-this:0 */
		return function(...args) {
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
