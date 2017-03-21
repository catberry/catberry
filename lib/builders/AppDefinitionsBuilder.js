'use strict';

const path = require('path');
const pfs = require('../promises/fs');
const hrTimeHelper = require('../helpers/hrTimeHelper');
const moduleHelper = require('../helpers/moduleHelper');
const templateHelper = require('../helpers/templateHelper');
const loadHelper = require('../helpers/loadHelper');
const requireHelper = require('../helpers/requireHelper');
const RouteParser = require('../tokenizers/RouteParser');

const APP_DEFINITIONS_FILENAME = 'appDefinitions.js';
const LIB_ROOT_PATH = path.join(__dirname, '..');
const STORES_REPLACE = '/** __stores **/';
const COMPONENTS_REPLACE = '/** __components **/';
const ROUTE_DESCRIPTORS_REPLACE = '\'__routes\'';
const ROUTE_DEFINITIONS_REPLACE = '\'__routeDefinitions\'';
const ROUTE_DEFINITIONS_FILENAME = 'routes.js';

/**
 * Implements the app definitions builder module.
 */
class AppDefinitionsBuilder {

	/**
	 * Creates a new instance of the app definitions builder.
	 * @param {ServiceLocator} locator The Service Locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current template provider list.
		 * @type {Array<TemplateProvider>}
		 * @private
		 */
		this._templateProviders = templateHelper.resolveTemplateProviders(locator);

		/**
		 * Current route parser.
		 * @type {RouteParser}
		 * @private
		 */
		this._routeParser = new RouteParser();
	}

	/**
	 * Creates a real app definitions code from the template.
	 * @param {Object} stores The found stores by their names.
	 * @param {Object} components The found components by their names.
	 * @returns {Promise<string>} The promise for the source code of the app definitions.
	 */
	build(stores, components) {
		const appDefinitionsTemplatePath = path.join(
			LIB_ROOT_PATH,
			APP_DEFINITIONS_FILENAME
		);
		const routeDefinitionsPath = path.join(
			process.cwd(),
			ROUTE_DEFINITIONS_FILENAME
		);

		const startTime = hrTimeHelper.get();
		this._eventBus.emit('info', `Building app definitions using the template "${appDefinitionsTemplatePath}"...`);

		return pfs.readFile(appDefinitionsTemplatePath, {
			encoding: 'utf8'
		})
			.then(file => Promise
				.all([
					this._generateStoreDescriptors(stores),
					this._generateComponentDescriptors(components)
				])
				.then(results => ({
					file,
					stores: results[0],
					components: results[1]
				})))
			// check if paths exist and create require statements or undefined
			.then(context =>
				pfs.exists(routeDefinitionsPath)
					.then(isExists => {
						const filePath = path.relative(
							process.cwd(), requireHelper.getValidPath(routeDefinitionsPath)
						);
						const requireString = isExists ? `require('./${filePath}')` : 'null';
						const routeDescriptors = [];

						if (isExists) {
							const routeDefinitions = require(routeDefinitionsPath);

							/* eslint max-nested-callbacks: 0 */
							routeDefinitions.forEach(definition => {
								if (typeof (definition) === 'string') {
									routeDescriptors.push(this._routeParser.parseRouteExpression(definition));
								}
								if (typeof (definition) === 'object' &&
										typeof (definition.expression) === 'string') {
									routeDescriptors.push(this._routeParser.parseRouteExpression(definition.expression));
								}
							});
						}

						return context.file
							.replace(COMPONENTS_REPLACE, context.components)
							.replace(STORES_REPLACE, context.stores)
							.replace(ROUTE_DEFINITIONS_REPLACE, requireString)
							.replace(ROUTE_DESCRIPTORS_REPLACE, JSON.stringify(routeDescriptors));
					})
			)
			.then(appDefinitions => {
				const hrTime = hrTimeHelper.get(startTime);
				this._eventBus.emit('appDefinitionsBuilt', {
					template: appDefinitionsTemplatePath,
					hrTime,
					time: hrTimeHelper.toMilliseconds(hrTime)
				});
				return appDefinitions;
			})
			.catch(reason => this._eventBus.emit('error', reason));
	}

	/**
	 * Generates inline descriptors for each store.
	 * @param {Object} stores The found stores by their names.
	 * @returns {Promise<string>} The promise for the JSON string that describes the stores.
	 * @private
	 */
	_generateStoreDescriptors(stores) {
		const storeRequires = [];
		Object
			.keys(stores)
			.forEach(storeName => {
				const filePath = requireHelper.getValidPath(
					path.relative(process.cwd(), stores[storeName].path)
				);
				const requireExpression = stores[storeName].path ?
					`require('./${filePath}')` : null;
				if (!requireExpression) {
					return;
				}
				storeRequires.push(`\n{name: '${storeName}', constructor: ${requireExpression}}`);
			});
		return Promise.resolve(storeRequires.join(','));
	}

	/**
	 * Generates inline descriptors for each component.
	 * @param {Object} components The found components by their names.
	 * @returns {Promise<string>} The promise for the JSON string that describes the components.
	 * @private
	 */
	_generateComponentDescriptors(components) {
		const promises = [];

		Object.keys(components)
			.forEach(componentName => {
				const componentDetails = components[componentName];
				const logicFile = components[componentName].properties.logic ||
						moduleHelper.DEFAULT_LOGIC_FILENAME;
				const logicPath = path.resolve(path.dirname(componentDetails.path), logicFile);
				const relativeLogicPath = path.relative(process.cwd(), logicPath);

				var constructor;

				try {
					constructor = require(logicPath);
				} catch (e) {
					this._eventBus.emit('error', e);
				}

				if (typeof (constructor) !== 'function' ||
					typeof (componentDetails.properties.template) !== 'string') {
					return;
				}

				const component = Object.create(componentDetails);
				const promise = loadHelper.loadTemplateSources(component)
					.then(() => loadHelper.assignTemplateProviders(component, this._templateProviders))
					.then(() => loadHelper.compileTemplates(component))
					.then(() => {
						const filePath = requireHelper.getValidPath(relativeLogicPath);
						const requireString = `require('./${filePath}')`;
						const errorTemplateString = component.compiledErrorTemplate !== null ?
										`'${escapeTemplateSource(component.compiledErrorTemplate)}'` : 'null';
						const errorTemplateProvider = component.errorTemplateProvider !== null ?
										`'${component.errorTemplateProvider.getName()}'` : 'null';
						return `
{
	name: '${componentName}',
	constructor: ${requireString},
	properties: ${JSON.stringify(componentDetails.properties)},
	templateProviderName: '${component.templateProvider.getName()}',
	compiledTemplate: '${escapeTemplateSource(component.compiledTemplate)}',
	errorTemplateProviderName: ${errorTemplateProvider},
	compiledErrorTemplate: ${errorTemplateString}
}`;
					});
				promises.push(promise);
			});

		return Promise
			.all(promises)
			.then(components => components.join(','));
	}
}

/**
 * Escapes template source code for including into the app definitions.
 * @param {string} source The compiled template source.
 * @returns {string} The escaped string.
 */
function escapeTemplateSource(source) {
	return source
		.replace(/(\\.)/g, '\\$&')
		.replace(/'/g, '\\\'')
		.replace(/\r/g, '\\r')
		.replace(/\n/g, '\\n')
		.replace(/\t/g, '\\t');
}

module.exports = AppDefinitionsBuilder;
