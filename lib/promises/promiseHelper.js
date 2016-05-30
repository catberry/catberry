'use strict';

module.exports = {

	/**
	 * Converts a method with a callback to the method that returns a promise.
	 * @param {Function} methodWithCallback The method with a callback.
	 * @param {Object} options
	 * @param {*} options.thisArg Context for execute methodWithCallback
	 * @param {Boolean} options.ignoreError Not reject on fist argument
	 * @returns {Function} The method that returns a promise.
	 */
	callbackToPromise: (methodWithCallback, options) => {
		options = options || {};

		/* eslint prefer-rest-params:0 */
		/* eslint no-invalid-this:0 */
		// TODO rewrite this when Spread operator and Rest parameters will be supported
		return function() {
			const args = Array.prototype.slice.call(arguments);
			return new Promise((fulfill, reject) => {
				args.push(function() {
					const internalArgs = Array.prototype.slice.call(arguments);

					let error;

					if (!options.ignoreError) {
						error = internalArgs.splice(0, 1)[0];
					}

					if (error) {
						reject(error);
						return;
					}

					fulfill(internalArgs[0]);
				});
				methodWithCallback.apply(options.thisArg || this, args);
			});
		};
	}
};
