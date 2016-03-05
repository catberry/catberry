'use strict';

const events = require('events');

class SerialWrapper {

	/**
	 * Creates a new instance of the serial wrapper for promises.
	 */
	constructor() {

		/**
		 * Current event emitter.
		 * @type {EventEmitter}
		 * @private
		 */
		this._emitter = new events.EventEmitter();
		this._emitter.setMaxListeners(0);

		/**
		 * Current set of named methods to invoke.
		 * @type {Object}
		 * @private
		 */
		this._toInvoke = Object.create(null);

		/**
		 * Current set of flags if the method is in progress.
		 * @type {Object}
		 * @private
		 */
		this._inProgress = Object.create(null);
	}

	/**
	 * Adds a method to the set.
	 * @param {string} name Method name.
	 * @param {Function} toInvoke Function that returns promise.
	 */
	add(name, toInvoke) {
		this._toInvoke[name] = toInvoke;
	}

	/**
	 * Returns true if the method with such name was registered to the set.
	 * @param {string} name Name of method.
	 * @returns {boolean} True if method name is registered.
	 */
	isRegistered(name) {
		return typeof (this._toInvoke[name]) === 'function';
	}

	/**
	 * Invokes a method without concurrency.
	 * @param {string} name Method name.
	 * @returns {Promise<Object>} Promise for result.
	 */
	invoke(name) {
		if (!this.isRegistered(name)) {
			return Promise.reject(new Error('There is no such registered method'));
		}

		if (this._inProgress[name]) {
			return new Promise((fulfill, reject) => {
				this._emitter.once(name, fulfill);
				this._emitter.once(`${name}--error`, reject);
			});
		}

		this._inProgress[name] = true;
		this._toInvoke[name]()
			.then(result => {
				this._emitter.emit(name, result);
				this._inProgress[name] = null;
			})
			.catch(reason => {
				this._emitter.emit(`${name}--error`, reason);
				this._inProgress[name] = null;
			});

		return this.invoke(name);
	}
}

module.exports = SerialWrapper;
