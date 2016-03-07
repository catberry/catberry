'use strict';

const path = require('path');
const hrTimeHelper = require('./helpers/hrTimeHelper');
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

		const logger = locator.resolve('logger');
		const eventBus = locator.resolve('eventBus');
		process.on('uncaughtException', error => logger.fatal(error));
		this.wrapEventsWithLogger(configObject, eventBus, logger);

		routeDefinitions.forEach(routeDefinition =>
			locator.registerInstance('routeDefinition', routeDefinition)
		);
	}

	/**
	 * Wraps an event bus with log messages.
	 * @param {Object} config Application config.
	 * @param {EventEmitter} eventBus Event emitter that implements the event bus.
	 * @param {Logger} logger Logger to write messages.
	 * @protected
	 */
	wrapEventsWithLogger(config, eventBus, logger) {
		super.wrapEventsWithLogger(config, eventBus, logger);

		if (logger.level() > 30) {
			return;
		}
		eventBus
			.on('storeFound', args => logger.info(`Store "${args.name}" found at ${args.path}`))
			.on('componentFound', args => logger.info(`Component "${args.name}" found at ${args.path}`))
			.on('bundleBuilt', args => {
				const timeMessage = hrTimeHelper.toMessage(args.hrTime);
				logger.info(`Browser bundle has been built at ${args.path} (${timeMessage})`);
			});
	}
}

module.exports = new Bootstrapper();
