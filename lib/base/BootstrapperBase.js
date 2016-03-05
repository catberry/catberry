'use strict';

const moduleHelper = require('../helpers/moduleHelper');
const hrTimeHelper = require('../helpers/hrTimeHelper');
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

	/**
	 * Wraps an event bus with log messages.
	 * @param {Object} config The application config.
	 * @param {EventEmitter} eventBus The event bus to wrap.
	 * @param {Logger} logger The logger to write messages.
	 * @protected
	 */
	wrapEventsWithLogger(config, eventBus, logger) {
		const isRelease = Boolean(config.isRelease);
		eventBus
			.on('componentLoaded', args => logger.info(`Component "${args.name}" loaded`))
			.on('storeLoaded', args => logger.info(`Store "${args.name}" loaded`))
			.on('allStoresLoaded', () => logger.info('All stores loaded'))
			.on('allComponentsLoaded', () => logger.info('All components loaded'))
			.on('error', error => logger.error(error));

		if (isRelease) {
			return;
		}
		eventBus
			.on('componentRender', args => {
				const id = getId(args.context);
				const tagName = moduleHelper.getTagNameForComponentName(args.name);
				logger.debug(`Component "${tagName}${id}" is being rendered...`);
			})
			.on('componentRendered', args => {
				const id = getId(args.context);
				const tagName = moduleHelper.getTagNameForComponentName(args.name);
				const time = Array.isArray(args.hrTime) ?
					` (${hrTimeHelper.toMessage(args.hrTime)})` : '';
				logger.debug(`Component "${tagName}${id}" rendered${time}`);
			})
			.on('documentRendered',
				args => logger.debug(`Document rendered for URI ${args.location.toString()}`));
	}
}

/**
 * Gets an ID for logging component-related messages.
 * @param  {Object} context The component's context.
 * @return {string} the ID of the element starting with '#'.
 */
function getId(context) {
	const id = context.attributes[moduleHelper.ATTRIBUTE_ID];
	return id ? `#${id}` : '';
}

module.exports = BootstrapperBase;
