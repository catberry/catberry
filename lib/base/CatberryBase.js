'use strict';

const ServiceLocator = require('catberry-locator');

/**
 * Implements the basic Catberry class for both server and browser environments.
 */
class CatberryBase {

	/**
	 * Creates a new instance of the basic Catberry application module.
	 */
	constructor() {

		/**
		 * Current service locator.
		 * @type {ServiceLocator}
		 */
		this.locator = new ServiceLocator();

		/**
		 * Current version of Catberry.
		 */
		this.version = '8.4.1';

		/**
		 * Current object with events.
		 * @type {ModuleApiProvider}
		 */
		this.events = null;

		this.locator.registerInstance('serviceLocator', this.locator);
		this.locator.registerInstance('catberry', this);
	}
}

module.exports = CatberryBase;
