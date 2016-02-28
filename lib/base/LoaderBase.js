'use strict';

/**
 * Implements the basic Loader class for both server
 * and browser environments.
 */
class LoaderBase {

	/**
	 * Creates an instance of the basic loader.
	 * @param {Array} transforms The list of module transformations.
	 * @constructor
	 */
	constructor(locator, transforms) {

		/**
		 * Current list of component transformations.
		 * @type {Array}
		 * @private
		 */
		this._transforms = transforms;
		this._eventBus = locator.resolve('eventBus');
	}

	/**
	 * Applies all the transformations for the loaded module.
	 * @param {Object} module The loaded module.
	 * @param {number?} index The transformation index in the list.
	 * @returns {Promise<Object>} The transformed module.
	 * @protected
	 */
	_applyTransforms(module, index) {
		if (index === undefined) {
			// the list is a stack, we should reverse it
			index = this._transforms.length - 1;
		}

		if (index < 0) {
			return Promise.resolve(module);
		}

		const transformation = this._transforms[index];

		return Promise.resolve()
			.then(() => transformation.transform(module))
			.catch(reason => {
				this._eventBus.emit('error', reason);
				return module;
			})
			.then(transformedModule => this._applyTransforms(transformedModule, index - 1));
	}
}

module.exports = LoaderBase;
