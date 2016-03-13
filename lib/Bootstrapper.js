'use strict';

const path = require('path');
const StoreDispatcher = require('./StoreDispatcher');
const ModuleApiProvider = require('./providers/ModuleApiProvider');
const CookieWrapper = require('./CookieWrapper');
const BrowserBundleBuilder = require('./builders/BrowserBundleBuilder');
const BootstrapperBuilder = require('./builders/BootstrapperBuilder');
const StoreFinder = require('./finders/StoreFinder');
const ComponentFinder = require('./finders/ComponentFinder');
const BootstrapperBase = require('./base/BootstrapperBase');
const Catberry = require('./Catberry');

var routeDefinitions;
// try to load list of URI mappers
try {
	routeDefinitions = require(path.join(process.cwd(), 'routes'));
} catch (e) {
	// nothing to do here
}
routeDefinitions = routeDefinitions || [];

class Bootstrapper extends BootstrapperBase {

	/**
	 * Creates a new instance of the server-side Catberry's bootstrapper.
	 */
	constructor() {
		super(Catberry);
	}

	/**
	 * Configures a Catberry's locator.
	 * @param {Object} configObject Config object.
	 * @param {ServiceLocator} locator Service locator to configure.
	 */
	configure(configObject, locator) {
		super.configure(configObject, locator);

		locator.register('storeDispatcher', StoreDispatcher);
		locator.register('moduleApiProvider', ModuleApiProvider);
		locator.register('cookieWrapper', CookieWrapper);

		locator.register('browserBundleBuilder', BrowserBundleBuilder, true);
		locator.register('bootstrapperBuilder', BootstrapperBuilder, true);
		locator.register('storeFinder', StoreFinder, true);
		locator.register('componentFinder', ComponentFinder, true);

		routeDefinitions.forEach(routeDefinition =>
			locator.registerInstance('routeDefinition', routeDefinition)
		);
	}
}

module.exports = new Bootstrapper();
