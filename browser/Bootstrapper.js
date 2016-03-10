/**
 * This file is a template and it is used only for some string replaces
 * by BrowserBundleBuilder module. It does not work by itself.
 */

'use strict';

const stores = [

/** __stores **/

];

const components = [

/** __components **/

];

const routeDefinitions = '__routeDefinitions' || [];

const Catberry = require('./node_modules/catberry/browser/Catberry.js');
const BootstrapperBase = require('./node_modules/catberry/lib/base/BootstrapperBase.js');
const StoreDispatcher = require('./node_modules/catberry/lib/StoreDispatcher');
const ModuleApiProvider = require('./node_modules/catberry/browser/providers/ModuleApiProvider');
const CookieWrapper = require('./node_modules/catberry/browser/CookieWrapper');

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

		// if browser still does not have promises then add it.
		if (!('Promise' in window)) {
			window.Promise = Promise;
		}

		locator.register('storeDispatcher', StoreDispatcher, true);
		locator.register('moduleApiProvider', ModuleApiProvider, true);
		locator.register('cookieWrapper', CookieWrapper, true);

		locator.registerInstance('window', window);

		routeDefinitions.forEach(routeDefinition =>
			locator.registerInstance('routeDefinition', routeDefinition));

		stores.forEach(store => locator.registerInstance('store', store));

		components.forEach(component => locator.registerInstance('component', component));
	}
}

module.exports = new Bootstrapper();
