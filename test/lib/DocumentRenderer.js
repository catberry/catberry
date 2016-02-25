'use strict';

const assert = require('assert');
const events = require('events');
const fs = require('fs');

const URI = require('catberry-uri').URI;
const Logger = require('../mocks/Logger');
const ServerResponse = require('../mocks/ServerResponse');
const ModuleApiProvider = require('../../lib/providers/ModuleApiProvider');
const CookieWrapper = require('../../lib/CookieWrapper');
const ServiceLocator = require('catberry-locator');
const ContextFactory = require('../../lib/ContextFactory');
const StoreDispatcher = require('../../lib/StoreDispatcher');
const DocumentRenderer = require('../../lib/DocumentRenderer');

const componentMocks = require('../mocks/components');
const storeMocks = require('../mocks/stores');

const testCases = require('../cases/lib/DocumentRenderer/test-cases.json');
const templateCache = Object.create(null);
const expectedHTMLCache = Object.create(null);

function createTemplateObject(templateFilename) {
	if (!templateFilename) {
		return null;
	}
	if (templateFilename in templateCache) {
		return templateCache[templateFilename];
	}

	/* eslint no-sync: 0 */
	const templateSource = fs.readFileSync(
		`${__dirname}/../cases/lib/DocumentRenderer/templates/${templateFilename}`
	).toString();

	templateCache[templateFilename] = {
		render: data => /%%throw%%/i.test(templateSource) ?
			Promise.reject(new Error('Template Error')) :
			Promise.resolve(
				templateSource
					.replace(/%%value%%/gi, typeof (data) === 'string' ? data : 'null')
					.replace(/%%error\.message%%/gi, data instanceof Error ? data.message : 'null')
			)
	};

	return templateCache[templateFilename];
}

function getExpectedHTML(documentName) {
	if (documentName in expectedHTMLCache) {
		return expectedHTMLCache[documentName];
	}

	/* eslint no-sync: 0 */
	const html = documentName ?
		fs.readFileSync(`${__dirname}/../cases/lib/DocumentRenderer/expected/${documentName}`).toString() :
		'';

	expectedHTMLCache[documentName] = html;
	return expectedHTMLCache[documentName];
}

function prepareTestCase(testCase) {
	const preparedComponents = {};

	if (testCase.components) {
		Object.keys(testCase.components).forEach(componentName => {
			const component = testCase.components[componentName];
			const preparedComponent = Object.create(component);
			preparedComponent.template = createTemplateObject(preparedComponent.template);
			preparedComponent.errorTemplate = createTemplateObject(preparedComponent.errorTemplate);
			preparedComponent.constructor = componentMocks[preparedComponent.constructor];
			preparedComponents[componentName] = preparedComponent;
		});
	}

	const preparedStores = {};

	if (testCase.stores) {
		Object.keys(testCase.stores).forEach(storeName => {
			const store = testCase.stores[storeName];
			const preparedStore = Object.create(store);
			preparedStore.constructor = storeMocks[preparedStore.constructor];
			preparedStores[storeName] = preparedStore;
		});
	}

	const preparedTestCase = Object.create(testCase);
	preparedTestCase.components = preparedComponents;
	preparedTestCase.stores = preparedStores;
	preparedTestCase.expectedHTML = getExpectedHTML(testCase.expectedHTML);
	return preparedTestCase;
}

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/DocumentRenderer', function() {
	describe('#render', function() {

		testCases.render.forEach(testCase => {
			it(testCase.name, function(done) {
				const preparedTestCase = prepareTestCase(testCase);
				const routingContext = createRoutingContext(
					preparedTestCase.config || {},
					preparedTestCase.stores, preparedTestCase.components
				);
				const documentRenderer = routingContext.locator.resolve('documentRenderer');
				documentRenderer.render({}, routingContext);
				const response = routingContext.middleware.response;
				response
					.on('error', done)
					.on('finish', () => {
						try {
							assert.strictEqual(
								response.result, preparedTestCase.expectedHTML
							);
							done();
						} catch (e) {
							done(e);
						}
					});
			});
		});

		it('should set code 200 and required headers', function(done) {
			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document.html')
				}
			};
			const routingContext = createRoutingContext({}, {}, components);
			const documentRenderer = routingContext.locator.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			const response = routingContext.middleware.response;
			response
				.on('error', done)
				.on('finish', () => {
					assert.strictEqual(response.status, 200);
					assert.deepEqual(response.setHeaders, {
						'Content-Type': 'text/html; charset=utf-8',
						'X-Powered-By': 'Catberry'
					});
					done();
				});
		});

		it('should set code 302 and Location if redirect in HEAD', function(done) {
			class Head {
				render() {
					this.$context.redirect('/to/garden');
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document-with-head.html')
				},
				head: {
					name: 'head',
					constructor: Head,
					template: createTemplateObject('head.html')
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.strictEqual(response.result, '');
					assert.strictEqual(response.status, 302);
					assert.strictEqual(
						response.setHeaders.Location, '/to/garden'
					);
					done();
				});
		});

		it('should set header if set cookie in HEAD', function(done) {
			class Head {
				render() {
					this.$context.cookie.set({
						key: 'first',
						value: 'value1'
					});
					this.$context.cookie.set({
						key: 'second',
						value: 'value2'
					});
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document-with-head.html')
				},
				head: {
					name: 'head',
					constructor: Head,
					template: createTemplateObject('head.html')
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.strictEqual(response.status, 200);
					assert.deepEqual(
						response.setHeaders['Set-Cookie'], [
							'first=value1',
							'second=value2'
						]
					);
					done();
				});
		});

		it('should pass to the next middleware if notFound()', function(done) {
			class Head {
				render() {
					this.$context.notFound();
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document-with-head.html')
				},
				head: {
					name: 'head',
					constructor: Head,
					template: createTemplateObject('head.html')
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');

			routingContext.middleware.next = function() {
				done();
			};
			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.fail('Should not finish the response');
				});
		});

		it('should render inline script if clearFragment() in HEAD', function(done) {
			class Head {
				render() {
					this.$context.clearFragment();
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document-with-head.html')
				},
				head: {
					name: 'head',
					constructor: Head,
					template: createTemplateObject('head.html')
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');
			const expectToHave = '<body><script>window.location.hash = \'\';</script>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.notEqual(response.result.indexOf(expectToHave), -1);
					done();
				});
		});

		it('should render inline script if clearFragment()', function(done) {
			class ClearFragmentComponent {
				render() {
					this.$context.clearFragment();
					return this.$context;
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document.html')
				},
				comp: {
					name: 'comp',
					constructor: ClearFragmentComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');
			const expectToHave = '<cat-comp id="1">' +
				'<script>window.location.hash = \'\';</script>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.notEqual(response.result.indexOf(expectToHave), -1);
					done();
				});
		});

		it('should render inline script if redirect()', function(done) {
			class RedirectComponent {
				render() {
					this.$context.redirect('/to/garden');
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document.html')
				},
				comp: {
					name: 'comp',
					constructor: RedirectComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');
			const expectToHave = '<cat-comp id="1">' +
				'<script>window.location.assign(\'/to/garden\');</script>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.notEqual(response.result.indexOf(expectToHave), -1);
					done();
				});
		});

		it('should render inline script if cookie.set()', function(done) {
			class CookieComponent {
				render() {
					this.$context.cookie.set({
						key: 'key',
						value: 'value'
					});
				}
			}

			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document.html')
				},
				comp: {
					name: 'comp',
					constructor: CookieComponent,
					template: createTemplateObject('component.html')
				}
			};

			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');
			const expectToHave = '<cat-comp id=\"1\">' +
					'<script>window.document.cookie = \'key=value\';</script>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', () => {
					assert.notEqual(response.result.indexOf(expectToHave), -1);
					done();
				});
		});

		it('should properly render debug info', function(done) {
			const components = {
				document: {
					name: 'document',
					constructor: componentMocks.AsyncComponent,
					template: createTemplateObject('document.html')
				},
				comp: {
					name: 'comp',
					constructor: componentMocks.AsyncErrorComponent,
					template: createTemplateObject('component.html')
				}
			};
			const routingContext = createRoutingContext({}, {}, components);
			const response = routingContext.middleware.response;
			const documentRenderer = routingContext.locator.resolve('documentRenderer');
			const expectToHave = 'Error: comp';

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', () => {
					assert.notEqual(response.result.indexOf(expectToHave), -1);
					done();
				});
		});
	});
});

function createRoutingContext(config, stores, components) {
	const locator = new ServiceLocator();
	locator.register('cookieWrapper', CookieWrapper, config);
	locator.register('logger', Logger, config);
	locator.register('contextFactory', ContextFactory, config, true);
	locator.register('documentRenderer', DocumentRenderer, config, true);
	locator.register('moduleApiProvider', ModuleApiProvider, config, true);
	locator.register('storeDispatcher', StoreDispatcher);
	locator.registerInstance('componentLoader', {
		load: () => Promise.resolve(),
		getComponentsByNames: () => components
	});
	locator.registerInstance('storeLoader', {
		load: () => Promise.resolve(),
		getStoresByNames: () => stores
	});
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	const eventBus = new events.EventEmitter();
	eventBus.on('error', function() {});
	locator.registerInstance('eventBus', eventBus);

	const contextFactory = locator.resolve('contextFactory');
	return contextFactory.create({
		referrer: new URI(),
		location: new URI(),
		userAgent: 'test',
		middleware: {
			response: new ServerResponse(),
			next: () => {}
		}
	});
}
