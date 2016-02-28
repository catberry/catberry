'use strict';

const assert = require('assert');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const ComponentLoader = require('../../../browser/loaders/ComponentLoader');
const ComponentFinder = require('../../mocks/finders/ComponentFinder');
const Logger = require('../../mocks/Logger');
const componentMocks = require('../../mocks/components');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/loaders/ComponentLoader', function() {
	var locator;
	beforeEach(function() {
		locator = createLocator({
			isRelease: true
		});
	});

	it('should properly load components', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {
					name: 'first-cool',
					logic: './logic.js',
					errorTemplate: './templates/error.html',
					template: './templates/template.html'
				},
				templateSource: 'Hello, world!',
				errorTemplateSource: 'Error occurs :('
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {
					logic: './index.js',
					template: './template.html'
				},
				templateSource: 'Hello from second!',
				errorTemplateSource: null
			}
		};

		registerComponents(components);
		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => {
				assert.strictEqual(loadedComponents, loader.getComponentsByNames());
				// can't use deepEqual because of templates
				assert.strictEqual(Object.keys(loadedComponents).length, 2);
				Object.keys(loadedComponents).forEach(key => {
					const actual = loadedComponents[key];
					const expected = components[key];
					assert.strictEqual(actual.name, expected.name);
					assert.strictEqual(actual.constructor, expected.constructor);
					assert.deepEqual(actual.properties, expected.properties);
				});

				const expected = [
					'Hello, world!',
					'Error occurs :(',
					'Hello from second!'
				];
				return Promise.all([
					loadedComponents['first-cool'].template.render(),
					loadedComponents['first-cool'].errorTemplate.render(),
					loadedComponents.second.template.render()
				])
					.then(rendered => assert.deepEqual(rendered, expected));
			})
			.then(done)
			.catch(done);
	});

	it('should not load components twice', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateSource: 'Hello, world!',
				errorTemplateSource: null
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {},
				templateSource: 'Hello from second!',
				errorTemplateSource: null
			}
		};

		registerComponents(components);
		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => {
				// can't use deepEqual because of templates
				assert.strictEqual(Object.keys(loadedComponents).length, 2);
				Object.keys(loadedComponents).forEach(key => {
					const actual = loadedComponents[key];
					const expected = components[key];
					assert.strictEqual(actual.name, expected.name);
					assert.strictEqual(actual.constructor, expected.constructor);
					assert.deepEqual(actual.properties, expected.properties);
				});
				locator.unregister('component');
				return loader.load();
			})
			.then(loadedComponents => {
				assert.strictEqual(loadedComponents, loader.getComponentsByNames());
				assert.strictEqual(Object.keys(loadedComponents).length, 2);
			})
			.then(done)
			.catch(done);
	});

	it('should properly transform components', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateSource: 'Hello, world!',
				errorTemplateSource: null
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {},
				templateSource: 'Hello from second!',
				errorTemplateSource: null
			}
		};

		registerComponents(components);

		locator.registerInstance('componentTransform', {
			transform: component => {
				component.name += '!';
				return Promise.resolve(component);
			}
		});
		locator.registerInstance('componentTransform', {
			transform: component => {
				component.name += '?';
				return component;
			}
		});

		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => {
				assert.strictEqual(loadedComponents['first-cool!?'].name, 'first-cool!?');
				assert.strictEqual(loadedComponents['second!?'].name, 'second!?');
			})
			.then(done)
			.catch(done);
	});

	it('should skip transform errors', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateSource: 'Hello, world!',
				errorTemplateSource: null
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {},
				templateSource: 'Hello from second!',
				errorTemplateSource: null
			}
		};

		registerComponents(components);

		locator.registerInstance('componentTransform', {
			transform: component => {
				component.name += '!';
				return Promise.resolve(component);
			}
		});
		locator.registerInstance('componentTransform', {
			transform: component => {
				throw new Error('Wrong!');
			}
		});

		locator.registerInstance('componentTransform', {
			transform: component => Promise.reject('Wrong!')
		});

		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => {
				assert.strictEqual(loadedComponents['first-cool!'].name, 'first-cool!');
				assert.strictEqual(loadedComponents['second!'].name, 'second!');
			})
			.then(done)
			.catch(done);
	});

	function registerComponents(components) {
		Object.keys(components).forEach(key => locator.registerInstance('component', components[key]));
	}

	function createLocator(config) {
		const locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('config', config);

		const eventBus = new events.EventEmitter();
		eventBus.on('error', () => {});
		locator.registerInstance('eventBus', eventBus);

		const templateProvider = {
			templates: {},
			render: name => Promise.resolve(templateProvider[name]),
			registerCompiled: (name, source) => {
				templateProvider[name] = source;
			}
		};
		locator.registerInstance('templateProvider', templateProvider);

		locator.register('componentLoader', ComponentLoader);
		locator.register('logger', Logger);
		return locator;
	}
});
