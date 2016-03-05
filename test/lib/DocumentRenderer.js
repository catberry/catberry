'use strict';

const assert = require('assert');
const events = require('events');

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
const testUtils = require('../utils');

const testCases = require('../cases/lib/DocumentRenderer/test-cases.json');
const TEMPLATES_DIR = `${__dirname}/../cases/lib/DocumentRenderer/templates/`;
const EXPECTED_DIR = `${__dirname}/../cases/lib/DocumentRenderer/expected/`;

function prepareTestCase(testCase) {
	const preparedTestCase = Object.create(testCase);
	preparedTestCase.components = {};
	preparedTestCase.stores = {};

	if (testCase.components) {
		preparedTestCase.components = testUtils.prepareComponents(TEMPLATES_DIR, testCase.components);
	}

	if (testCase.stores) {
		preparedTestCase.stores = testUtils.prepareStores(testCase.stores);
	}

	if (preparedTestCase.expectedHTML !== '') {
		preparedTestCase.expectedHTML = testUtils.getHTML(
			`${EXPECTED_DIR}${testCase.expectedHTML}`
		);
	}

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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document-with-head.html`)
				},
				head: {
					name: 'head',
					constructor: Head,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}head.html`)
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document-with-head.html`)
				},
				head: {
					name: 'head',
					constructor: Head,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}head.html`)
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document-with-head.html`)
				},
				head: {
					name: 'head',
					constructor: Head,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}head.html`)
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document-with-head.html`)
				},
				head: {
					name: 'head',
					constructor: Head,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}head.html`)
				},
				'async-comp': {
					name: 'async-comp',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document.html`)
				},
				comp: {
					name: 'comp',
					constructor: ClearFragmentComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document.html`)
				},
				comp: {
					name: 'comp',
					constructor: RedirectComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document.html`)
				},
				comp: {
					name: 'comp',
					constructor: CookieComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}document.html`)
				},
				comp: {
					name: 'comp',
					constructor: componentMocks.AsyncErrorComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}component.html`)
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
