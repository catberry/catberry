'use strict';

const assert = require('assert');
const events = require('events');
const testCases = require('../../cases/lib/loaders/ComponentLoader/test-cases.json');
const ServiceLocator = require('catberry-locator');
const ComponentLoader = require('../../../lib/loaders/ComponentLoader');
const ContextFactory = require('../../../lib/ContextFactory');
const ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider');
const CookieWrapper = require('../../../lib/CookieWrapper');
const ComponentFinder = require('../../mocks/finders/ComponentFinder');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/loaders/ComponentLoader', function() {
	testCases.load.forEach(testCase => {
		it(testCase.name, function(done) {
			const locator = createLocator(testCase.components);
			const loader = locator.resolve('componentLoader');

			loader
				.load()
				.then(loadedComponents => {
					// loader should cache the components
					assert.strictEqual(loadedComponents, loader.getComponentsByNames());

					const componentNames = Object.keys(loadedComponents);
					assert.strictEqual(componentNames.length, testCase.expectedCount);

					componentNames.forEach(componentName => {
						const component = loadedComponents[componentName];
						const expected = testCase.components[componentName];
						assert.strictEqual(component.name, expected.name);
						assert.strictEqual(component.path, expected.path);
						assert.deepEqual(component.properties, expected.properties);
						assert.strictEqual(typeof (component.constructor), 'function');
					});

					if (componentNames.length === 0) {
						return null;
					}

					return Promise
						.all(componentNames.map(componentName => loadedComponents[componentName].template.render()))
						.then(rendered => assert.deepEqual(rendered, testCase.expectedTemplates))
						.then(() => {
							const promises = componentNames.map(componentName => {
								const component = loadedComponents[componentName];
								if (!component.errorTemplate) {
									return null;
								}
								return component.errorTemplate.render();
							});
							return Promise.all(promises);
						})
						.then(rendered => assert.deepEqual(rendered, testCase.expectedErrorTemplates));
				})
				.then(done)
				.catch(done);
		});

		if (testCase.expectedCount === 0) {
			return;
		}

		it(`${testCase.name} (with transformation)`, function(done) {
			const locator = createLocator(testCase.components);

			locator.registerInstance('componentTransform', {
				transform: component => {
					component.name += '!';
					return component;
				}
			});
			locator.registerInstance('componentTransform', {
				transform: component => {
					component.name += '?';
					return Promise.resolve(component);
				}
			});

			const loader = locator.resolve('componentLoader');

			loader
				.load()
				.then(loadedComponents => {
					const componentNames = Object.keys(loadedComponents);
					assert.strictEqual(componentNames.length, testCase.expectedCount);

					Object.keys(testCase.components)
						.forEach(componentName => {
							const expected = testCase.components[componentName];
							const newName = `${expected.name}!?`;
							const component = loadedComponents[newName];
							assert.strictEqual(component.name, newName);
						});
				})
				.then(done)
				.catch(done);
		});
	});

	it('should throw error if transform returns a bad result', function(done) {
		const components = {
			'first-cool': {
				name: 'first-cool',
				path: 'test/cases/lib/loaders/ComponentLoader/first/first.json',
				properties: {
					logic: './logic.js',
					template: './templates/template.html'
				}
			}
		};

		const locator = createLocator(components);

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
});

function createLocator(components) {
	const locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', {isRelease: true});

	const eventBus = new events.EventEmitter();
	eventBus.on('error', function() {});

	const templateProvider = {
		templates: {},
		compile: str => Promise.resolve(str),
		render: name => Promise.resolve(templateProvider[name]),
		registerCompiled: (name, source) => {
			templateProvider[name] = source;
		}
	};

	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('componentFinder', new ComponentFinder(components));
	locator.registerInstance('templateProvider', templateProvider);
	locator.register('contextFactory', ContextFactory);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('componentLoader', ComponentLoader);
	return locator;
}
