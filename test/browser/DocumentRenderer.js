'use strict';

const fs = require('fs');
const assert = require('assert');
const events = require('events');
const jsdom = require('jsdom');

const StoreDispatcher = require('../../lib/StoreDispatcher');
const ContextFactory = require('../../lib/ContextFactory');
const ModuleApiProvider = require('../../lib/providers/ModuleApiProvider');
const CookieWrapper = require('../../browser/CookieWrapper');
const DocumentRenderer = require('../../browser/DocumentRenderer');
const ServiceLocator = require('catberry-locator');

const storeMocks = require('../mocks/stores');
const componentMocks = require('../mocks/components');

const testUtils = require('../utils');
const testCases = require('../cases/browser/DocumentRenderer/test-cases.json');

const TEMPLATES_DIR = `${__dirname}/../cases/browser/DocumentRenderer/templates/`;
const EXPECTED_DIR = `${__dirname}/../cases/browser/DocumentRenderer/expected/`;

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/DocumentRenderer', function() {

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

		if (preparedTestCase.html) {
			preparedTestCase.html = testUtils.getHTML(`${TEMPLATES_DIR}${testCase.html}`);
		}

		if (preparedTestCase.elementHTML) {
			preparedTestCase.elementHTML = testUtils.getHTML(`${TEMPLATES_DIR}${testCase.elementHTML}`);
		}

		if (preparedTestCase.expectedHTML !== '') {
			preparedTestCase.expectedHTML = testUtils.getHTML(`${EXPECTED_DIR}${testCase.expectedHTML}`);
		}
		return preparedTestCase;
	}

	describe('#initWithState', function() {
		it('should init and bind all components in right order', function(done) {

			/* eslint no-sync: 0 */
			const html = testUtils.getHTML(`${TEMPLATES_DIR}document-many-nested.html`);
			const bindCalls = [];
			class NestComponent {
				bind() {
					const id = this.$context.attributes.id ?
						`-${this.$context.attributes.id}` : '';
					bindCalls.push(this.$context.name + id);
				}
			}

			const components = {
				comp: {
					name: 'comp',
					constructor: NestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				},
				head: {
					name: 'head',
					constructor: NestComponent,
					templateSource: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				},
				document: {
					name: 'document',
					constructor: NestComponent,
					templateSource: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components, {});

			const expected = [
				'comp-1',
				'comp-2',
				'comp-3',
				'comp-4',
				'comp-5',
				'comp-6',
				'comp-7',
				'comp-8',
				'comp-9',
				'comp-10',
				'comp-11',
				'comp-12',
				'comp-13',
				'comp-14',
				'comp-15',
				'comp-16',
				'comp-17',
				'comp-18',
				'head',
				'document'
			];

			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({}, {})
						.then(() => assert.deepEqual(bindCalls, expected))
						.then(done)
						.catch(done);
				}
			});
		});
	});

	describe('#renderComponent', function() {
		testCases.renderComponent.forEach(testCase => {
			it(testCase.name, function(done) {
				const preparedTestCase = prepareTestCase(testCase);
				const locator = createLocator(
					preparedTestCase.config || {}, preparedTestCase.components, preparedTestCase.stores
				);

				jsdom.env({
					html: preparedTestCase.html,
					done: (errors, window) => {
						if (errors) {
							assert.fail(errors);
						}
						const element = window.document.querySelector(preparedTestCase.tagName) ||
							window.document.createElement(preparedTestCase.tagName);
						if (preparedTestCase.elementHTML) {
							element.innerHTML = preparedTestCase.elementHTML;
						}
						if (preparedTestCase.attributes) {
							Object.keys(preparedTestCase.attributes)
								.forEach(name => element.setAttribute(name, preparedTestCase.attributes[name]));
						}

						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);

						renderer.renderComponent(element)
							.then(() => assert.strictEqual(
								element.innerHTML.trim(), preparedTestCase.expectedHTML.trim())
							)
							.catch(error => {
								if (preparedTestCase.errorMessage) {
									assert.strictEqual(error.message, preparedTestCase.errorMessage);
								} else {
									throw error;
								}
							})
							.then(done)
							.catch(done);
					}
				});
			});
		});

		it('should render debug output instead the content when error in debug mode', function(done) {
			const components = {
				test: {
					name: 'test',
					constructor: componentMocks.SyncErrorComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components, {});

			const check = /Error: test/;

			jsdom.env({
				html: testUtils.getHTML(`${TEMPLATES_DIR}stub.html`),
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.catch(error => {
							assert.strictEqual(error.message, 'test');
							assert.strictEqual(check.test(element.innerHTML), true);
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should bind all events from bind method', function(done) {
			class Component1 {
				render() {
					return this.$context.name;
				}
				bind() {
					return {
						click: {
							'a.clickable': event => {
								event.target.innerHTML += 'Component1';
							}
						}
					};
				}
			}

			class Component2 {
				render() {
					return this.$context.name;
				}
				bind() {
					return {
						click: {
							'a.clickable': event => {
								event.currentTarget.innerHTML = 'Component2';
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component2,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable2.html`)
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testUtils.getHTML(`${EXPECTED_DIR}clickable.html`);

			jsdom.env({
				html: testUtils.getHTML(`${TEMPLATES_DIR}stub.html`),
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(() => {
							const links = element.querySelectorAll('a.clickable');
							for (let i = 0; i < links.length; i++) {
								testUtils.click(links[i], {
									view: window,
									bubbles: true,
									cancelable: true,
									button: 0
								});
							}

							return testUtils.wait(1);
						})
						.then(() => assert.strictEqual(element.innerHTML, expected))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should handle dispatched events', function(done) {
			class Component1 {
				render() {
					return this.$context.name;
				}
				bind() {
					return {
						click: {
							'a.clickable': event => {
								event.target.parentNode.innerHTML += 'Component1';
								event.currentTarget.parentNode.innerHTML += 'Component1';
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable3.html`)
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testUtils.getHTML(`${EXPECTED_DIR}dispatched-event.html`);

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(() => {
							const toClick = element.querySelectorAll('div.toclick');
							for (let i = 0; i < toClick.length; i++) {
								testUtils.click(toClick[i], {
									view: window,
									bubbles: true,
									cancelable: true,
									button: 0
								});
							}
							return testUtils.wait(1);
						})
						.then(() => assert.strictEqual(element.innerHTML, expected))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should do nothing if event selector does not match', function(done) {
			class Component1 {
				render() {
					return this.$context.name;
				}
				bind() {
					return {
						click: {
							'a.non-clickable': event => {
								event.target.parentNode.innerHTML += 'Component1';
								event.currentTarget.parentNode.innerHTML += 'Component1';
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable3.html`)
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testUtils.getHTML(`${EXPECTED_DIR}not-dispatched-event.html`);

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(() => {
							const toClick = element.querySelectorAll('div.toclick');
							for (let i = 0; i < toClick.length; i++) {
								testUtils.click(toClick[i], {
									view: window,
									bubbles: true,
									cancelable: true,
									button: 0
								});
							}
							return testUtils.wait(1);
						})
						.then(() => assert.strictEqual(element.innerHTML, expected))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should do nothing if event handler is not a function', function(done) {
			class Component1 {
				render() {
					return this.$context.name;
				}
				bind() {
					return {
						click: {
							'a.non-clickable': 'wrong handler'
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable3.html`)
				}
			};

			const locator = createLocator({}, components, {});
			const expected = testUtils.getHTML(`${EXPECTED_DIR}not-dispatched-event.html`);

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(() => {
							const toClick = element.querySelectorAll('div.toclick');
							for (let i = 0; i < toClick.length; i++) {
								testUtils.click(toClick[i], {
									view: window,
									bubbles: true,
									cancelable: true,
									button: 0
								});
							}
							return testUtils.wait(1);
						})
						.then(() => assert.strictEqual(element.innerHTML, expected))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should unbind all events and call unbind', function(done) {
			const bindCounters = {
				first: 0,
				second: 0
			};
			const unbindCounters = {
				first: 0,
				second: 0
			};
			class Component1 {
				render() {
					return this.$context.name;
				}
				bind() {
					bindCounters.first++;
				}
				unbind() {
					unbindCounters.first++;
				}
			}

			class Component2 {
				render() {
					return this.$context.name;
				}
				bind() {
					bindCounters.second++;
				}
				unbind() {
					unbindCounters.second++;
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component2,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable2.html`)
				}
			};

			const locator = createLocator({}, components, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(() => {
							return renderer.renderComponent(element);
						})
						.then(() => {
							const toClick = element.querySelectorAll('a.clickable');
							for (let i = 0; i < toClick.length; i++) {
								testUtils.click(toClick[i], {
									view: window,
									bubbles: true,
									cancelable: true,
									button: 0
								});
							}
							return testUtils.wait(1);
						})
						.then(() => {
							assert.deepEqual(bindCounters, {first: 2, second: 2});
							assert.deepEqual(unbindCounters, {first: 1, second: 1});
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should use the same component instance if it\'s element recreated after rendering', function(done) {
			const instances = {
				first: [],
				second: [],
				third: []
			};
			class Component1 {
				constructor() {
					instances.first.push(this);
				}
				render() {
					return this.$context.name;
				}
			}
			class Component2 {
				constructor() {
					instances.second.push(this);
				}
				render() {
					return this.$context.name;
				}
			}

			class Component3 {
				constructor() {
					instances.third.push(this);
				}
				render() {
					return this.$context.name;
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component2,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`)
				},
				test3: {
					name: 'test3',
					constructor: Component3,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(() => renderer.renderComponent(element))
						.then(() => renderer.renderComponent(element))
						.then(() => {
							assert.strictEqual(instances.first.length, 1);
							assert.strictEqual(instances.second.length, 1);
							assert.strictEqual(instances.third.length, 2);
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should use new component instance if it\'s element removed after rendering', function(done) {
			const instances = {
				first: [],
				second: [],
				third: []
			};

			var shouldRender = true;

			class Component1 {
				constructor() {
					instances.first.push(this);
				}
				render() {
					return this.$context.name;
				}
			}
			class Component2 {
				constructor() {
					instances.second.push(this);
				}
				render() {
					return this.$context.name;
				}
			}

			class Component3 {
				constructor() {
					instances.third.push(this);
				}
				render() {
					return this.$context.name;
				}
			}

			const template1 = testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`);
			const template2 = testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`);
			const template3 = testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`);

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: {
						render: data => shouldRender ? template1.render(data) : ''
					}
				},
				test2: {
					name: 'test2',
					constructor: Component2,
					template: {
						render: data => shouldRender ? template2.render(data) : ''
					}
				},
				test3: {
					name: 'test3',
					constructor: Component3,
					template: {
						render: data => shouldRender ? template3.render(data) : ''
					}
				}
			};

			const locator = createLocator({}, components, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(() => {
							shouldRender = false;
							return renderer.renderComponent(element);
						})
						.then(() => {
							shouldRender = true;
							return renderer.renderComponent(element);
						})
						.then(() => {
							assert.strictEqual(instances.first.length, 1);
							assert.strictEqual(instances.second.length, 2);
							assert.strictEqual(instances.third.length, 4);
						})
						.then(done)
						.catch(done);
				}
			});
		});
	});

	describe('#render', function() {
		it('should update all components that depend on changed stores', function(done) {
			const renders = [];
			class Component1 {
				render() {
					renders.push(this.$context.attributes.id);
					return this.$context.name;
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`)
				},
				test3: {
					name: 'test3',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const stores = {
				store1: {
					name: 'store1',
					constructor: storeMocks.AsyncDataStore
				},
				store2: {
					name: 'store2',
					constructor: storeMocks.AsyncDataStore
				},
				store3: {
					name: 'store3',
					constructor: storeMocks.AsyncDataStore
				}
			};

			const locator = createLocator({}, components, stores);
			const html = testUtils.getHTML(`${TEMPLATES_DIR}complex-with-stores.html`);

			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({}, {});
					renderer
						.render({
							store1: {},
							store2: {},
							store3: {}
						}, {})
						.then(() => {
							assert.strictEqual(renders.length, 3);
							assert.strictEqual(renders[0], 'test1-1');
							assert.strictEqual(renders[1], 'test1-2');
							assert.strictEqual(renders[2], 'test2-1');
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should update all components that depend on changed store by .changed() method', function(done) {
			const renders = [];
			class Component1 {
				constructor() {
					testUtils.wait(1)
						.then(() => this.$context.sendAction('test'));
				}
				render() {
					renders.push(this.$context.attributes.id);
					return this.$context.name;
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`)
				},
				test3: {
					name: 'test3',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			class TimerStore {
				handleTest() {
					testUtils.wait(1)
						.then(() => this.$context.changed());
				}
			}

			const stores = {
				store1: {
					name: 'store1',
					constructor: TimerStore
				},
				store2: {
					name: 'store2',
					constructor: TimerStore
				},
				store3: {
					name: 'store3',
					constructor: TimerStore
				}
			};

			const locator = createLocator({}, components, stores);
			const html = testUtils.getHTML(`${TEMPLATES_DIR}complex-with-stores.html`);

			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({}, {});
					renderer
						.render({
							store1: {},
							store2: {},
							store3: {}
						}, {})
						.then(() => {
							assert.strictEqual(renders.length, 3);
							assert.strictEqual(renders[0], 'test1-1');
							assert.strictEqual(renders[1], 'test1-2');
							assert.strictEqual(renders[2], 'test2-1');
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should do nothing if nothing changes', function(done) {
			const renders = [];
			class Component1 {
				constructor() {
					testUtils.wait(1)
						.then(() => this.$context.sendAction('test'));
				}
				render() {
					renders.push(this.$context.attributes.id);
					return this.$context.name;
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`)
				},
				test3: {
					name: 'test3',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const stores = {
				store1: {
					name: 'store1',
					constructor: storeMocks.AsyncDataStore
				},
				store2: {
					name: 'store2',
					constructor: storeMocks.AsyncDataStore
				},
				store3: {
					name: 'store3',
					constructor: storeMocks.AsyncDataStore
				}
			};

			const locator = createLocator({}, components, stores);
			const html = testUtils.getHTML(`${TEMPLATES_DIR}complex-with-stores.html`);
			const state = {
				store1: {},
				store2: {},
				store3: {}
			};

			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState(state, {});
					renderer
						.render(state, {})
						.then(() => assert.strictEqual(renders.length, 0))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should not do rendering concurrently', function(done) {
			const renders = [];
			class Component1 {
				render() {
					renders.push(this.$context.attributes.id);
					return this.$context.name;
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`)
				},
				test3: {
					name: 'test3',
					constructor: Component1,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const stores = {
				store1: {
					name: 'store1',
					constructor: storeMocks.AsyncDataStore
				},
				store2: {
					name: 'store2',
					constructor: storeMocks.AsyncDataStore
				},
				store3: {
					name: 'store3',
					constructor: storeMocks.AsyncDataStore
				}
			};

			const locator = createLocator({}, components, stores);
			const html = testUtils.getHTML(`${TEMPLATES_DIR}complex-with-stores.html`);

			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({}, {});
					Promise.all([
						renderer.render({
							store1: {}
						}, {}),
						renderer.render({
							store1: {},
							store2: {}
						}, {}),
						renderer.render({
							store1: {},
							store2: {},
							store3: {}
						}, {})
					])
						.then(() => {
							assert.strictEqual(renders.length, 3);
							assert.strictEqual(renders[0], 'test1-1');
							assert.strictEqual(renders[1], 'test1-2');
							assert.strictEqual(renders[2], 'test2-1');
						})
						.then(done)
						.catch(done);
				}
			});
		});
	});

	describe('#createComponent', function() {
		testCases.renderComponent.forEach(testCase => {
			it(testCase.name, function(done) {
				const preparedTestCase = prepareTestCase(testCase);
				const locator = createLocator(
					preparedTestCase.config || {}, preparedTestCase.components, preparedTestCase.stores
				);

				jsdom.env({
					html: preparedTestCase.html,
					done: (errors, window) => {
						if (errors) {
							assert.fail(errors);
						}

						locator.registerInstance('window', window);
						var element = null;
						const renderer = new DocumentRenderer(locator);
						renderer.createComponent(preparedTestCase.tagName, preparedTestCase.attributes || {})
							.then(el => {
								element = el;
								assert.strictEqual(element.innerHTML.trim(), preparedTestCase.expectedHTML.trim());
							})
							// in case of error it should not return an element
							.catch(error => assert.strictEqual(element, null))
							.then(done)
							.catch(done);
					}
				});
			});
		});

		it('should reject promise if wrong component', function(done) {
			const locator = createLocator({}, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.createComponent('cat-wrong', {
						id: 'unique'
					})
						.then(() => assert.fail('Should fail'))
						.catch(reason =>
							assert.strictEqual(reason.message, 'Component for tag "cat-wrong" not found'))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should reject promise if ID is not specified', function(done) {
			const components = {
				test: {
					name: 'test',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components);

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.createComponent('cat-test', {})
						.then(() => assert.fail('Should fail'))
						.catch(reason =>
							assert.strictEqual(reason.message, 'The ID is not specified or already used'))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should reject promise if ID is already used', function(done) {
			const components = {
				test: {
					name: 'test',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components);

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.createComponent('cat-test', {
						id: 'some'
					})
						.then(() => renderer.createComponent('cat-test', {
							id: 'some'
						}))
						.then(() => assert.fail('Should fail'))
						.catch(reason =>
							assert.strictEqual(reason.message, 'The ID is not specified or already used'))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should reject promise if tag name is not a string', function(done) {
			const locator = createLocator({}, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.createComponent(100500, {
						id: 'some'
					})
						.then(() => assert.fail('Should fail'))
						.catch(reason =>
							assert.strictEqual(
								reason.message,
								'Tag name should be a string and attributes should be an object')
							)
						.then(done)
						.catch(done);
				}
			});
		});

		it('should reject promise if attributes set is not an object', function(done) {
			const locator = createLocator({}, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.createComponent('cat-test', 100500)
						.then(() => assert.fail('Should fail'))
						.catch(reason =>
							assert.strictEqual(
								reason.message,
								'Tag name should be a string and attributes should be an object')
							)
						.then(done)
						.catch(done);
				}
			});
		});
	});

	describe('#collectGarbage', function() {
		it('should unlink component if it is not in DOM', function(done) {
			const components = {
				test1: {
					name: 'test1',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested2.html`)
				},
				test3: {
					name: 'test3',
					constructor: componentMocks.AsyncComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					const element = window.document.createElement('cat-test3');
					element.setAttribute('id', 'unique1');
					window.document.body.appendChild(element);
					Promise.all([
						renderer.renderComponent(element).then(() => element),
						renderer.createComponent('cat-test1', {
							id: 'unique2'
						}),
						renderer.createComponent('cat-test3', {
							id: 'unique3'
						})
					])
						.then(elements => {
							window.document.body.appendChild(elements[2]);
							const areInstances = elements.every(el => {
								const id = el.getAttribute('id');
								const instance = renderer.getComponentById(id);
								return instance instanceof componentMocks.AsyncComponent;
							});
							assert.strictEqual(areInstances, true);
							return renderer.collectGarbage();
						})
						.then(() => {
							const instance1 = renderer.getComponentById('unique1');
							const instance2 = renderer.getComponentById('unique2');
							const instance3 = renderer.getComponentById('unique3');

							assert.strictEqual(instance1 instanceof componentMocks.AsyncComponent, true);
							assert.strictEqual(instance2, null);
							assert.strictEqual(instance3 instanceof componentMocks.AsyncComponent, true);
						})
						.then(done)
						.catch(done);
				}
			});
		});
	});
});

function createLocator(config, components, stores) {
	const locator = new ServiceLocator();

	locator.registerInstance('componentLoader', {
		load: () => Promise.resolve(),
		getComponentsByNames: () => components
	});
	locator.registerInstance('storeLoader', {
		load: () => Promise.resolve(),
		getStoresByNames: () => stores
	});

	locator.register('contextFactory', ContextFactory, true);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('storeDispatcher', StoreDispatcher);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	const eventBus = new events.EventEmitter();
	eventBus.on('error', () => {});
	locator.registerInstance('eventBus', eventBus);

	return locator;
}
