'use strict';

const Catberry = require('./Catberry.js');
const BootstrapperBase = require('../lib/base/BootstrapperBase');
const StoreDispatcher = require('../lib/StoreDispatcher');
const ModuleApiProvider = require('./providers/ModuleApiProvider');
const CookieWrapper = require('./CookieWrapper');

class Bootstrapper extends BootstrapperBase {

	/**
	 * Creates a new instance of the browser Catberry's bootstrapper.
	 */
	constructor() {
		super(Catberry);
	}

	/**
	 * Configures a Catberry's service locator.
	 * @param {Object} configObject The application config object.
	 * @param {ServiceLocator} locator The service locator to configure.
	 */
	configure(configObject, locator) {
		super.configure(configObject, locator);

		locator.register('storeDispatcher', StoreDispatcher, true);
		locator.register('moduleApiProvider', ModuleApiProvider, true);
		locator.register('cookieWrapper', CookieWrapper, true);

		locator.registerInstance('window', window);
	}
}

module.exports = new Bootstrapper();
