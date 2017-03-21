'use strict';

const assert = require('assert');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const ComponentLoader = require('../../../browser/loaders/ComponentLoader');
const ComponentFinder = require('../../mocks/finders/ComponentFinder');
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
					errorTemplate: './templates/error.html1',
					template: './templates/template.html1'
				},
				templateProviderName: 'html1',
				errorTemplateProviderName: 'html1',
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: 'Error occurs :('
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {
					logic: './index.js',
					template: './template.html2'
				},
				templateProviderName: 'html2',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello from second!',
				compiledErrorTemplate: null
			},
			third: {
				constructor: componentMocks.AsyncComponent,
				name: 'third',
				properties: {
					logic: './index.js',
					template: './template.html1',
					errorTemplate: './error.html2'
				},
				templateProviderName: 'html1',
				errorTemplateProviderName: 'html2',
				compiledTemplate: 'Hello from third!',
				compiledErrorTemplate: 'Error from third!'
			}

		};

		registerComponents(components);
		locator.unregister('templateProvider');

		const templates = {};
		locator.registerInstance('templateProvider', {
			getName: () => 'html1',
			render: name => Promise.resolve(`html1: ${templates[name]}`),
			registerCompiled: (name, source) => {
				templates[name] = source;
			}
		});
		locator.registerInstance('templateProvider', {
			getName: () => 'html2',
			render: name => Promise.resolve(`html2: ${templates[name]}`),
			registerCompiled: (name, source) => {
				templates[name] = source;
			}
		});

		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => {
				assert.strictEqual(loadedComponents, loader.getComponentsByNames());
				// can't use deepEqual because of templates
				assert.strictEqual(Object.keys(loadedComponents).length, 3);
				Object.keys(loadedComponents).forEach(key => {
					const actual = loadedComponents[key];
					const expected = components[key];
					assert.strictEqual(actual.name, expected.name);
					assert.strictEqual(actual.constructor, expected.constructor);
					assert.deepEqual(actual.properties, expected.properties);
				});

				const expected = [
					'html1: Hello, world!',
					'html1: Error occurs :(',
					'html2: Hello from second!',
					'html1: Hello from third!',
					'html2: Error from third!'
				];
				return Promise.all([
					loadedComponents['first-cool'].template.render(),
					loadedComponents['first-cool'].errorTemplate.render(),
					loadedComponents.second.template.render(),
					loadedComponents.third.template.render(),
					loadedComponents.third.errorTemplate.render()
				])
					.then(rendered => assert.deepEqual(rendered, expected));
			})
			.then(done)
			.catch(done);
	});

	it('should not load component if an error occurs', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: 'html',
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: 'Error occurs :('
			}
		};

		registerComponents(components);
		locator.unregister('templateProvider');
		locator.registerInstance('templateProvider', {
			register: () => Promise.reject(new Error('TestError'))
		});
		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => assert.deepEqual(loadedComponents, {}))
			.then(done)
			.catch(done);
	});

	it('should not load component if there is no template provider', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: 'html',
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: 'Error occurs :('
			}
		};

		registerComponents(components);
		locator.unregister('templateProvider');

		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => assert.deepEqual(loadedComponents, {}))
			.then(done)
			.catch(done);
	});

	it('should not load component if there is no suitable template provider', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: 'html',
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: 'Error occurs :('
			}
		};

		registerComponents(components);
		locator.unregister('templateProvider');
		locator.registerInstance('templateProvider', {
			getName: () => 'wrong',
			registerCompiled: () => {},
			render: () => {}
		});

		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => assert.deepEqual(loadedComponents, {}))
			.then(done)
			.catch(done);
	});

	it('should load nothing if no components are registered', function(done) {
		registerComponents({});
		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => assert.deepEqual(loadedComponents, {}))
			.then(done)
			.catch(done);
	});

	it('should load nothing if no component objects are registered', function(done) {
		registerComponents({some: 'wrong'});
		const loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(loadedComponents => assert.deepEqual(loadedComponents, {}))
			.then(done)
			.catch(done);
	});

	it('should return an empty object if the load method has not been called yet', function() {
		const loader = locator.resolve('componentLoader');
		assert.deepEqual(loader.getComponentsByNames(), {});
	});

	it('should not load components twice', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: 'html',
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: null
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello from second!',
				compiledErrorTemplate: null
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
				templateProviderName: 'html',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: null
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello from second!',
				compiledErrorTemplate: null
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

	it('should throw error if transform returns a bad result', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: null
			}
		};

		registerComponents(components);

		locator.registerInstance('componentTransform', {
			transform: component => null
		});

		const eventBus = locator.resolve('eventBus');
		const loader = locator.resolve('componentLoader');

		eventBus.once('error', () => done());

		loader
			.load()
			.catch(done);
	});

	it('should skip transform errors', function(done) {
		const components = {
			'first-cool': {
				constructor: componentMocks.SyncComponent,
				name: 'first-cool',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello, world!',
				compiledErrorTemplate: null
			},
			second: {
				constructor: componentMocks.AsyncComponent,
				name: 'second',
				properties: {},
				templateProviderName: 'html',
				errorTemplateProviderName: null,
				compiledTemplate: 'Hello from second!',
				compiledErrorTemplate: null
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
			getName: () => 'html',
			render: name => Promise.resolve(templateProvider[name]),
			registerCompiled: (name, source) => {
				templateProvider[name] = source;
			}
		};
		locator.registerInstance('templateProvider', templateProvider);

		locator.register('componentLoader', ComponentLoader);
		return locator;
	}
});
