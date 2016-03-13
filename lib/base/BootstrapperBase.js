'use strict';

const moduleHelper = require('../helpers/moduleHelper');
const StateProvider = require('../providers/StateProvider');
const StoreLoader = require('../loaders/StoreLoader');
const ComponentLoader = require('../loaders/ComponentLoader');
const DocumentRenderer = require('../DocumentRenderer');
const RequestRouter = require('../RequestRouter');
const ModuleApiProviderBase = require('../base/ModuleApiProviderBase');
const ContextFactory = require('../ContextFactory');
const EventEmitter = require('events').EventEmitter;

/**
 * Implements the basic bootstrapper class
 * for both server and browser environments.
 */
class BootstrapperBase {

	/**
	 * Creates a new instance of the basic Catberry bootstrapper.
	 * @param {Function} catberryConstructor Constructor
	 * of the Catberry's main module.
	 */
	constructor(catberryConstructor) {

		/**
		 * Current constructor of the Catberry's main module.
		 * @type {Function}
		 * @private
		 */
		this._catberryConstructor = catberryConstructor;
	}

	/**
	 * Creates a new full-configured instance of the Catberry application.
	 * @param {Object?} configObject The configuration object.
	 * @returns {Catberry} The Catberry application instance.
	 */
	create(configObject) {
		const currentConfig = configObject || {};
		const catberry = new this._catberryConstructor();

		this.configure(currentConfig, catberry.locator);
		catberry.events = new ModuleApiProviderBase(catberry.locator);
		return catberry;
	}

	/**
	 * Configures a locator with all required type registrations.
	 * @param {Object} configObject The configuration object.
	 * @param {ServiceLocator} locator The Service locator to configure.
	 */
	configure(configObject, locator) {
		const eventBus = new EventEmitter();
		eventBus.setMaxListeners(0);
		locator.registerInstance('eventBus', eventBus);
		locator.registerInstance('config', configObject);
		locator.register('stateProvider', StateProvider, true);
		locator.register('contextFactory', ContextFactory, true);
		locator.register('storeLoader', StoreLoader, true);
		locator.register('componentLoader', ComponentLoader, true);
		locator.register('documentRenderer', DocumentRenderer, true);
		locator.register('requestRouter', RequestRouter, true);
	}
}

module.exports = BootstrapperBase;
