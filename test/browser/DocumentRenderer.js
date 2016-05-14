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
								if (error instanceof assert.AssertionError) {
									throw error;
								}
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
			class TestComponent {
				render() {
					return this.$context.name;
				}
				bind() {
					return {
						click: {
							'a.clickable': event => {
								event.target.innerHTML += `inner:${this.$context.name}`;
							}
						}
					};
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable1.html`)
				},
				test2: {
					name: 'test2',
					constructor: TestComponent,
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
			const binds = [];
			const unbinds = [];
			const clicks = [];

			class TestComponent {
				render() {
					return this.$context.name;
				}
				bind() {
					binds.push(this.$context.name);
					return {
						click: {
							'a.clickable': e => this.onClick(e)
						}
					};
				}
				unbind() {
					unbinds.push(this.$context.name);
				}
				onClick(e) {
					e.stopPropagation();
					clicks.push(this.$context.name);
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}clickable1.html`)
				},
				test2: {
					name: 'test2',
					constructor: TestComponent,
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
					renderer.renderComponent(element)
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
						.then(() => renderer.collectGarbage())
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
							assert.deepEqual(binds, [
								'test2',
								'test1'
							]);
							assert.deepEqual(unbinds, [
								'test2',
								'test1'
							]);
							assert.deepEqual(clicks, [
								'test1',
								'test2'
							]);
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

		let renders, unbinds, binds, locator, components, stores;
		const html = testUtils.getHTML(`${TEMPLATES_DIR}render-test-page.html`);

		class TestComponent {
			render() {
				renders.push(this.$context.attributes.id);
				return this.$context.name;
			}
			bind() {
				binds.push(this.$context.attributes.id);
			}
			unbind() {
				unbinds.push(this.$context.attributes.id);
			}
		}

		beforeEach(function() {
			renders = [];
			binds = [];
			unbinds = [];

			components = {
				test1: {
					name: 'test1',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}render-test-comp1.html`)
				},
				test2: {
					name: 'test2',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}render-test-comp2.html`)
				},
				test3: {
					name: 'test3',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}render-test-comp3.html`)
				},
				test4: {
					name: 'test4',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}render-test-comp4.html`)
				},
				test5: {
					name: 'test5',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};
			stores = {
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

			locator = createLocator({}, components, stores);
		});

		it('should update all components that depend on changed stores', function(done) {
			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({}, {})
						.then(() => binds.push('==separator=='))
						.then(() => renderer.render({
							store1: {},
							store2: {},
							store3: {}
						}, {}))
						.then(() => {
							assert.deepEqual(renders, [
								'in-test1-2',
								'in-test1-1',
								'in-test4-1',
								'in-test2-1',
								'in-test3-1'
							]);

							assert.deepEqual(binds, [
								'in-test3-1',
								'in-test4-1',
								'in-test2-1',
								'in-test1-2',
								'in-test1-1',
								'root',
								'==separator==',
								'in-test4-1',
								'in-test1-2',
								'in-test3-1',
								'in-test2-1',
								'in-test1-1'
							]);

							assert.deepEqual(unbinds, [
								'in-test3-1',
								'in-test4-1',
								'in-test2-1',
								'in-test1-2',
								'in-test1-1'
							]);
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should update all components that depend on changed store by .changed() method', function(done) {
			class ActionComponent extends TestComponent {
				constructor() {
					super();
					this.$context.sendAction('test');
				}
			}
			class TimerStore {
				handleTest() {
					testUtils.wait(5)
						.then(() => this.$context.changed());
				}
			}

			components.test2.constructor = ActionComponent;
			stores.store2.constructor = TimerStore;

			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({
						store1: {},
						store2: {},
						store3: {}
					}, {})
						.then(() => binds.push('==separator=='))
						.then(() => testUtils.wait(10))
						.then(() => {
							assert.deepEqual(renders, [
								'in-test4-1',
								'in-test1-1',
								'in-test2-1',
								'in-test3-1'
							]);

							assert.deepEqual(binds, [
								'in-test3-1',
								'in-test4-1',
								'in-test2-1',
								'in-test1-2',
								'in-test1-1',
								'root',
								'==separator==',
								'in-test4-1',
								'in-test3-1',
								'in-test2-1',
								'in-test1-1'
							]);

							assert.deepEqual(unbinds, [
								'in-test3-1',
								'in-test2-1',
								'in-test1-1'
							]);
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should do nothing if nothing changes', function(done) {
			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({
						store1: {},
						store2: {},
						store3: {}
					}, {})
						.then(() => binds.push('==separator=='))
						.then(() => renderer.render({
							store1: {},
							store2: {},
							store3: {}
						}, {}))
						.then(() => {
							assert.strictEqual(renders.length, 0);
							assert.strictEqual(unbinds.length, 0);
							assert.strictEqual(binds[binds.length - 1], '==separator==');
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should not do rendering concurrently', function(done) {
			jsdom.env({
				html,
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					renderer.initWithState({}, {})
						.then(() => binds.push('==separator=='))
						.then(() => Promise.all([
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
						]))
						.then(() => {
							assert.deepEqual(renders, [
								'in-test1-2',
								'in-test1-1',
								'in-test4-1',
								'in-test2-1',
								'in-test3-1'
							]);

							assert.deepEqual(binds, [
								'in-test3-1',
								'in-test4-1',
								'in-test2-1',
								'in-test1-2',
								'in-test1-1',
								'root',
								'==separator==',
								'in-test4-1',
								'in-test1-2',
								'in-test3-1',
								'in-test2-1',
								'in-test1-1'
							]);

							assert.deepEqual(unbinds, [
								'in-test3-1',
								'in-test4-1',
								'in-test2-1',
								'in-test1-2',
								'in-test1-1'
							]);
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
						renderer.createComponent(preparedTestCase.tagName, preparedTestCase.attributes)
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
								'The tag name must be a string')
							)
						.then(done)
						.catch(done);
				}
			});
		});

	});

	describe('#collectGarbage', function() {
		it('should unlink component if it is not in DOM', function(done) {

			const unbinds = [];
			class TestComponent extends componentMocks.AsyncComponent {
				unbind() {
					unbinds.push(this.$context.name);
				}
			}

			const components = {
				test1: {
					name: 'test1',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}nested1.html`)
				},
				test2: {
					name: 'test2',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				},
				test3: {
					name: 'test3',
					constructor: TestComponent,
					template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
				}
			};

			const locator = createLocator({}, components, {});

			jsdom.env({
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const renderer = new DocumentRenderer(locator);
					let componentElements = null;

					Promise.all([
						renderer.createComponent('cat-test1'),
						renderer.createComponent('cat-test2'),
						renderer.createComponent('cat-test3')
					])
						.then(elements => {
							componentElements = elements;
							window.document.body.appendChild(elements[1]);
							const areInstances = elements.every(el => {
								const instance = renderer.getComponentByElement(el);
								return instance instanceof componentMocks.AsyncComponent;
							});
							assert.strictEqual(areInstances, true);
							return renderer.collectGarbage();
						})
						.then(() => {
							const instance1 = renderer.getComponentByElement(componentElements[0]);
							const instance2 = renderer.getComponentByElement(componentElements[1]);
							const instance3 = renderer.getComponentByElement(componentElements[2]);

							assert.strictEqual(instance1, null);
							assert.strictEqual(instance2 instanceof TestComponent, true);
							assert.strictEqual(instance3, null);

							assert.deepEqual(unbinds, [
								'test3',
								'test3',
								'test2',
								'test1'
							]);
						})
						.then(done)
						.catch(done);
				}
			});
		});
	});

	describe('search methods', function() {

		describe('#getComponentByElement', function() {

			it('should find a component by element', function(done) {
				let element = null;
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentByElement(element);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="to-find"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						element = window.document.getElementById('to-find');
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => assert.strictEqual(found instanceof Component2, true))
							.then(done)
							.catch(done);
					}
				});
			});

			it('should return null if the component is not found by element', function(done) {
				let element = null;
				let found = undefined;
				class Component1 {
					bind() {
						found = this.$context.getComponentByElement(element);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="wrong"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						element = window.document.getElementById('to-find');
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => assert.strictEqual(found, null))
							.then(done)
							.catch(done);
					}
				});
			});

		});

		describe('#getComponentById', function() {

			it('should find a component by ID', function(done) {
				const id = 'uniqueId';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentById(id);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="${id}"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => assert.strictEqual(found instanceof Component2, true))
							.then(done)
							.catch(done);
					}
				});
			});

			it('should return null if the component is not found by ID', function(done) {
				const id = 'uniqueId';
				let found = undefined;
				class Component1 {
					bind() {
						found = this.$context.getComponentById(id);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test2 id="wrong"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => assert.strictEqual(found, null))
							.then(done)
							.catch(done);
					}
				});
			});

			it('should return null if the element found by ID is not a component', function(done) {
				const id = 'to-find';
				let found = undefined;
				class Component1 {
					bind() {
						found = this.$context.getComponentById(id);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test3 id="${id}"></cat-test3>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => assert.strictEqual(found, null))
							.then(done)
							.catch(done);
					}
				});
			});

		});

		describe('#getComponentsByTagName', function() {
			it('should find components by a tag name', function(done) {
				const tagName = 'cat-test2';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentsByTagName(tagName);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 4);
								assert.strictEqual(found.every(item => item instanceof Component2), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should find components by a tag name in a parent', function(done) {
				const tagName = 'cat-test2';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentsByTagName(tagName, this);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 class="nested"></cat-test2>
		<cat-test2 class="nested"></cat-test2>
	</cat-test1>

	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 2);
								assert.strictEqual(found.every(item =>
									item instanceof Component2 && item.$context.element.className === 'nested'
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should filter elements which are not components', function(done) {
				const tagName = 'cat-test2';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentsByTagName(tagName);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 0);
							})
							.then(done)
							.catch(done);
					}
				});
			});
		});

		describe('#getComponentsByClassName', function() {
			it('should find components by a class name', function(done) {
				const className = 'to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentsByClassName(className);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 4);
								assert.strictEqual(found.every(
									item => item instanceof Component2 && item.$context.element.className === 'to-find'
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should find components by a class name in a parent', function(done) {
				const className = 'to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentsByClassName(className, this);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 class="${className} nested"></cat-test2>
		<cat-test2 class="${className} nested"></cat-test2>
	</cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 2);
								assert.strictEqual(found.every(item =>
									item instanceof Component2 && item.$context.element.className === `${className} nested`
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should filter elements which are not components', function(done) {
				const className = 'to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.getComponentsByClassName(className);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test3 class="${className}"></cat-test3>
	<cat-test3 class="${className}"></cat-test3>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 2);
								assert.strictEqual(found.every(item =>
									item instanceof Component2 && item.$context.name === 'test2'
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});
		});

		describe('#queryComponentSelector', function() {
			it('should find a component by a selector', function(done) {
				const selector = '#to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.queryComponentSelector(selector);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 id="some"></cat-test2>
	<cat-test2 id="to-find"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Component2, true);
								assert.strictEqual(found.$context.element.id, 'to-find');
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should find a component by a selector in a parent', function(done) {
				const selector = '#to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.queryComponentSelector(selector, this);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 id="to-find" class="nested"></cat-test2>
		<cat-test2></cat-test2>
	</cat-test1>

	<cat-test2 id="to-find"></cat-test2>
	<cat-test2></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Component2, true);
								assert.strictEqual(found.$context.element.className, 'nested');
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should return null if the element found by class is not a component', function(done) {
				const selector = '.to-find';
				let found = undefined;
				class Component1 {
					bind() {
						found = this.$context.queryComponentSelector(selector);
					}
				}

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>
	<cat-test3 class="to-find"></cat-test3>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => assert.strictEqual(found, null))
							.then(done)
							.catch(done);
					}
				});
			});
		});

		describe('#queryComponentSelectorAll', function() {
			it('should find components by a selector', function(done) {
				const className = 'to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.queryComponentSelectorAll(`.${className}`);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 4);
								assert.strictEqual(found.every(
									item => item instanceof Component2 && item.$context.element.className === 'to-find'
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should find components by a selector in a parent', function(done) {
				const className = 'to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.queryComponentSelectorAll(`.${className}`, this);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1>
		<cat-test2 class="${className} nested"></cat-test2>
		<cat-test2 class="${className} nested"></cat-test2>
	</cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 2);
								assert.strictEqual(found.every(item =>
									item instanceof Component2 && item.$context.element.className === `${className} nested`
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should filter elements which are not components', function(done) {
				const className = 'to-find';
				let found = null;
				class Component1 {
					bind() {
						found = this.$context.queryComponentSelectorAll(`.${className}`);
					}
				}
				class Component2 { }

				const components = {
					test1: {
						name: 'test1',
						constructor: Component1,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					},
					test2: {
						name: 'test2',
						constructor: Component2,
						template: testUtils.createTemplateObject(`${TEMPLATES_DIR}simple-component.html`)
					}
				};

				const locator = createLocator({}, components, {});
				const html = `
<html>
<body>
	<cat-test1></cat-test1>

	<cat-test2 class="${className}"></cat-test2>
	<cat-test2 class="${className}"></cat-test2>
	<cat-test3 class="${className}"></cat-test3>
	<cat-test3 class="${className}"></cat-test3>
</body>
</html>`;

				jsdom.env({
					html,
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const renderer = new DocumentRenderer(locator);
						renderer.initWithState({}, {})
							.then(() => {
								assert.strictEqual(found instanceof Array, true);
								assert.strictEqual(found.length, 2);
								assert.strictEqual(found.every(item =>
									item instanceof Component2 && item.$context.name === 'test2'
								), true);
							})
							.then(done)
							.catch(done);
					}
				});
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
