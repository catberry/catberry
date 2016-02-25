'use strict';

/**
 * Implements the basic Cookie Wrapper class for both server
 * and browser environments.
 */
class DocumentRendererBase {

	/**
	 * Creates a new instance of the basic document renderer.
	 * @param {ServiceLocator} locator The locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current service locator.
		 * @type {ServiceLocator}
		 * @protected
		 */
		this._serviceLocator = locator;

		/**
		 * Current context factory.
		 * @type {ContextFactory}
		 * @protected
		 */
		this._contextFactory = locator.resolve('contextFactory');

		/**
		 * Current component loader.
		 * @type {ComponentLoader}
		 * @protected
		 */
		this._componentLoader = locator.resolve('componentLoader');

		/**
		 * Current event bus.
		 * @param  {EventEmitter}
		 */
		this._eventBus = locator.resolve('eventBus');

		const storeLoader = locator.resolve('storeLoader');

		/**
		 * Current module loading promise.
		 * @type {Promise}
		 * @protected
		 */
		this._loading = Promise.all([
			this._componentLoader.load(),
			storeLoader.load()
		])
			.then(() => {
				this._loading = null;
				this._eventBus.emit('ready');
			})
			.catch(reason => this._eventBus.emit('error', reason));
	}

	/**
	 * Gets a promise for the state when Catberry will be able to handle requests.
	 * @returns {Promise} Promise for nothing.
	 * @protected
	 */
	_getPromiseForReadyState() {
		return this._loading ?
			this._loading :
			Promise.resolve();
	}
}

module.exports = DocumentRendererBase;
