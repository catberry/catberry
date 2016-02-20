'use strict';

module.exports = {

	/**
	 * Defines a read-only property.
	 * @param {Object} object The object to define a property in.
	 * @param {string} name The name of the property.
	 * @param {*} value The value of the property.
	 */
	defineReadOnly: (object, name, value) => {
		Object.defineProperty(object, name, {
			enumerable: false,
			configurable: false,
			writable: false,
			value
		});
	}
};
