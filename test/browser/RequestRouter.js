'use strict';

const assert = require('assert');
const events = require('events');
const jsdom = require('jsdom');
const UniversalMock = require('../mocks/UniversalMock');
const ServiceLocator = require('catberry-locator');
const StateProvider = require('../../lib/providers/StateProvider');
const ContextFactory = require('../../lib/ContextFactory');
const CookieWrapper = require('../../browser/CookieWrapper');
const RequestRouter = require('../../browser/RequestRouter');
const testCases = require('../cases/browser/RequestRouter.json');
const testUtils = require('../utils');

	/* eslint prefer-arrow-callback:0 */
	/* eslint max-nested-callbacks:0 */
	/* eslint require-jsdoc:0 */
describe('browser/RequestRouter', function() {
	var locator, documentRenderer, eventBus;

	beforeEach(function() {
		locator = new ServiceLocator();

		eventBus = new events.EventEmitter();
		locator.registerInstance('eventBus', eventBus);
		locator.registerInstance('serviceLocator', locator);
		locator.register('cookieWrapper', CookieWrapper);
		documentRenderer = {
			initWithState: (state, context) => documentRenderer.render(state, context),
			render: (state, context) => {
				const last = documentRenderer.context;
				documentRenderer.state = state;
				documentRenderer.context = context;
				if (last) {
					eventBus.emit('documentRendered', context);
				}
				return Promise.resolve();
			}
		};
		locator.registerInstance('documentRenderer', documentRenderer);
		locator.registerInstance('moduleApiProvider', new UniversalMock(['redirect']));
		locator.register('stateProvider', StateProvider);
		locator.register('contextFactory', ContextFactory);
	});

	function clickTest(options) {
		// name, location, html, clickSelector, clickOptions
		it(options.name, function(done) {
			var isRouted = false;
			var counter = 0;

			locator.registerInstance('routeDefinition', {
				expression: '/some/:global1[first, second]?global2=:global2[first, second]&first=:first[first]&second=:second[second]',
				map: state => {
					counter++;
					return state;
				}
			});

			locator.registerInstance('routeDefinition', '/some/');
			locator.registerInstance('routeDefinition', '/some/test1/test2');

			const expectedLocation = 'http://local/some/global1Value?global2=global2Value&first=firstValue&second=secondValue';
			const expectedState = {
				first: {
					first: 'firstValue',
					global1: 'global1Value',
					global2: 'global2Value'
				},
				second: {
					second: 'secondValue',
					global1: 'global1Value',
					global2: 'global2Value'
				}
			};

			eventBus.on('error', done);
			eventBus.once('documentRendered', context => {
				try {
					assert.strictEqual(context.location.toString(), expectedLocation);
					assert.deepEqual(documentRenderer.state, expectedState);
					isRouted = true;
				} catch (e) {
					done(e);
				}
			});

			jsdom.env({
				url: options.location || 'http://local',
				html: options.html,
				done: (errors, window) => {
					const clickOptions = options.clickOptions || {
						bubbles: true,
						cancelable: true,
						button: 0
					};
					clickOptions.view = window;

					const clickSelector = options.clickSelector || 'a';

					locator.registerInstance('window', window);
					const router = new RequestRouter(locator);
					counter = 0;
					testUtils.click(window.document.querySelector(clickSelector), clickOptions);

					testUtils.wait(1)
						.then(() => {
							if (options.shouldNot) {
								assert.strictEqual(isRouted, false);
							} else {
								assert.strictEqual(window.location.toString(), expectedLocation);
								assert.strictEqual(counter, 1);
								assert.strictEqual(window.history.length, 2);
								assert.strictEqual(isRouted, true);
							}
						})
						.then(done)
						.catch(done);
				}
			});
		});
	}

	describe('#go', function() {

		testCases.route.forEach(testCase => clickTest(testCase));

		describe('click', function() {

			it('should properly handle an error while clicking a link', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => Promise.reject(new Error('TestError')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', error => {
					assert.strictEqual(error.message, 'TestError');
					done();
				});

				jsdom.env({
					url: 'http://local/some?first=z',
					html: '<a href="http://local/some?first=x"></a>',
					done: (errors, window) => {
						const clickOptions = {
							bubbles: true,
							cancelable: true,
							view: window,
							button: 0
						};
						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);
						testUtils.click(window.document.querySelector('a'), clickOptions);
					}
				});
			});

			it('should properly handle URI fragment setting while clicking', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => done(new Error('Should not route')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', done);

				jsdom.env({
					url: 'http://local/some?first=z',
					html: '<a href="#fragment"></a>',
					done: (errors, window) => {
						const clickOptions = {
							bubbles: true,
							cancelable: true,
							view: window,
							button: 0
						};
						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);
						testUtils.click(window.document.querySelector('a'), clickOptions);
						testUtils.wait(10)
							.then(() => {
								assert.strictEqual(window.document.location.toString(), 'http://local/some?first=z#fragment');
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should properly handle URI fragment removal while clicking', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => done(new Error('Should not route')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', done);

				jsdom.env({
					url: 'http://local/some?first=z#fragment',
					html: '<a href="/some?first=z"></a>',
					done: (errors, window) => {
						const clickOptions = {
							bubbles: true,
							cancelable: true,
							view: window,
							button: 0
						};
						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);
						testUtils.click(window.document.querySelector('a'), clickOptions);
						testUtils.wait(10)
							.then(() => {
								assert.strictEqual(window.document.location.toString(), 'http://local/some?first=z');
							})
							.then(done)
							.catch(done);
					}
				});
			});

			it('should do nothing if defaultPrevented while clicking', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => done(new Error('Should not route')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', done);

				jsdom.env({
					url: 'http://local/some?first=z',
					html: '<a href="http://local/some?first=x"></a>',
					done: (errors, window) => {
						const clickOptions = {
							bubbles: true,
							cancelable: true,
							view: window,
							button: 0
						};

						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);
						const element = window.document.querySelector('a');
						element.addEventListener('click', event => event.preventDefault());
						testUtils.click(element, clickOptions);
						testUtils.wait(10).then(done);
					}
				});
			});
		});

		describe('history', function() {

			it('should properly handle an error while going back in the history', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => Promise.reject(new Error('TestError')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', error => {
					assert.strictEqual(error.message, 'TestError');
					done();
				});

				jsdom.env({
					url: 'http://local/some?first=z',
					html: ' ',
					done: (errors, window) => {
						locator.registerInstance('window', window);
						window.history.pushState({}, '', 'http://local/some?first=x');
						const router = new RequestRouter(locator);
						window.history.back();
					}
				});
			});

			it('should do nothing if history is not supported while clicking', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => done(new Error('Should not route')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', done);

				jsdom.env({
					url: 'http://local/some?first=z',
					html: '<a href="http://local/some?first=x"></a>',
					done: (errors, window) => {
						const clickOptions = {
							bubbles: true,
							cancelable: true,
							view: window,
							button: 0
						};

						window.history.pushState = undefined;

						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);
						testUtils.click(window.document.querySelector('a'), clickOptions);
						testUtils.wait(10).then(done);
					}
				});
			});

			it('should do nothing if history is not supported while going explicitly', function(done) {
				locator.unregister('documentRenderer');
				locator.registerInstance('documentRenderer', {
					render: () => done(new Error('Should not route')),
					initWithState: () => Promise.resolve()
				});
				locator.registerInstance('routeDefinition', '/some?first=:first[first]');
				eventBus.once('error', done);

				jsdom.env({
					url: 'http://local/some?first=z',
					html: '',
					done: (errors, window) => {
						window.history.pushState = undefined;
						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);
						router.go('http://local/some?first=x')
							.then(done)
							.catch(done);
					}
				});
			});

			it('should set previous state if "back" is called', function(done) {
				locator.registerInstance('routeDefinition',
					'/some?global=:global[first, second]&first=:first[first]&second=:second[second]'
				);

				const expectedState = [
					{
						first: {
							first: '0',
							global: '0'
						},
						second: {
							second: '0',
							global: '0'
						}
					},
					{
						first: {
							first: '1',
							global: '1'
						},
						second: {
							second: '1',
							global: '1'
						}
					},
					{
						first: {
							first: '2',
							global: '2'
						},
						second: {
							second: '2',
							global: '2'
						}
					}
				];

				const locations = [
					'http://local/some?global=0&first=0&second=0',
					'http://local/some?global=1&first=1&second=1',
					'http://local/some?global=2&first=2&second=2'
				];

				eventBus.on('error', done);

				const initialLocation = 'http://local/some?global=x&first=x&second=x';
				const initialState = {
					first: {
						first: 'x',
						global: 'x'
					},
					second: {
						second: 'x',
						global: 'x'
					}
				};
				jsdom.env({
					url: initialLocation,
					html: ' ',
					done: (errors, window) => {
						locator.registerInstance('window', window);
						const router = new RequestRouter(locator);

						router.go(locations[0])
							.then(() => {
								assert.strictEqual(window.location.toString(), locations[0]);
								assert.strictEqual(window.history.length, 2);
								assert.deepEqual(documentRenderer.state, expectedState[0]);
								return router.go(locations[1]);
							})
							.then(() => {
								assert.strictEqual(window.location.toString(), locations[1]);
								assert.strictEqual(window.history.length, 3);
								assert.deepEqual(documentRenderer.state, expectedState[1]);
								return router.go(locations[2]);
							})
							.then(() => {
								assert.strictEqual(window.location.toString(), locations[2]);
								assert.strictEqual(window.history.length, 4);
								assert.deepEqual(documentRenderer.state, expectedState[2]);
								window.history.back();
								return testUtils.wait(10);
							})
							.then(() => {
								assert.strictEqual(window.location.toString(), locations[1]);
								assert.deepEqual(documentRenderer.state, expectedState[1]);
								window.history.back();
								return testUtils.wait(10);
							})
							.then(() => {
								assert.strictEqual(window.location.toString(), locations[0]);
								assert.deepEqual(documentRenderer.state, expectedState[0]);
								window.history.back();
								return testUtils.wait(10);
							})
							.then(() => {
								assert.strictEqual(window.location.toString(), initialLocation);
								assert.deepEqual(documentRenderer.state, initialState);
							})
							.then(done)
							.catch(done);
					}
				});
			});
		});

		it('should properly handle an invalid URI', function(done) {
			jsdom.env({
				url: 'http://local',
				html: '',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const router = new RequestRouter(locator);
					router.go('/some?%%%%')
						.then(() => {
							throw new Error('Should fail');
						})
						.catch(error => assert.strictEqual(error.message, 'URI malformed'))
						.then(done)
						.catch(done);
				}
			});
		});

		it('should properly handle an error while wrapping the document', function(done) {
			locator.unregister('documentRenderer');
			locator.registerInstance('documentRenderer', {
				render: () => Promise.resolve(),
				initWithState: () => Promise.reject(new Error('TestError'))
			});
			locator.registerInstance('routeDefinition', '/some?first=:first[first]');
			eventBus.once('error', error => {
				assert.strictEqual(error.message, 'TestError');
				done();
			});

			jsdom.env({
				url: 'http://local/some?first=z',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					window.history.pushState({}, '', 'http://local/some?first=x');
					const router = new RequestRouter(locator);
				}
			});
		});

		it('should properly handle URI fragment setting', function(done) {
			locator.unregister('documentRenderer');
			locator.registerInstance('documentRenderer', {
				render: () => done(new Error('Should not route')),
				initWithState: () => Promise.resolve()
			});
			locator.registerInstance('routeDefinition', '/some?first=:first[first]');
			eventBus.once('error', done);

			jsdom.env({
				url: 'http://local/some?first=z',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const router = new RequestRouter(locator);
					router.go('http://local/some?first=z#fragment')
						.then(() => {
							assert.strictEqual(window.document.location.toString(), 'http://local/some?first=z#fragment');
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should properly handle URI fragment removal', function(done) {
			locator.unregister('documentRenderer');
			locator.registerInstance('documentRenderer', {
				render: () => done(new Error('Should not route')),
				initWithState: () => Promise.resolve()
			});
			locator.registerInstance('routeDefinition', '/some?first=:first[first]');
			eventBus.once('error', done);

			jsdom.env({
				url: 'http://local/some?first=z#fragment',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					const router = new RequestRouter(locator);
					router.go('http://local/some?first=z')
						.then(() => {
							assert.strictEqual(window.document.location.toString(), 'http://local/some?first=z');
						})
						.then(done)
						.catch(done);
				}
			});
		});

		it('should immediately change the location after "go" call', function(done) {
			locator.unregister('documentRenderer');
			locator.registerInstance('documentRenderer', {
				render: () => testUtils.wait(1000),
				initWithState: () => Promise.resolve()
			});
			locator.registerInstance('routeDefinition', '/some?first=:first[first]');
			eventBus.once('error', done);

			const link = 'http://local/some?first=x';
			jsdom.env({
				url: 'http://local/some?first=z',
				html: `<a href="${link}"></a>`,
				done: (errors, window) => {
					const clickOptions = {
						bubbles: true,
						cancelable: true,
						view: window,
						button: 0
					};

					locator.registerInstance('window', window);
					const router = new RequestRouter(locator);
					const element = window.document.querySelector('a');
					testUtils.click(element, clickOptions);
					assert.strictEqual(window.location.toString(), link);
					done();
				}
			});
		});

		it('should assign a new location if the state is null', function(done) {
			locator.unregister('documentRenderer');
			locator.registerInstance('documentRenderer', {
				render: () => done(new Error('Should not route')),
				initWithState: () => Promise.resolve()
			});
			locator.registerInstance('routeDefinition', '/some?first=:first[first]');
			eventBus.once('error', done);

			jsdom.env({
				url: 'http://local/some?first=z',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					window.location.assign = location => {
						try {
							assert.strictEqual(location, 'http://local');
							done();
						} catch (e) {
							done(e);
						}
					};

					const router = new RequestRouter(locator);
					router.go('http://local')
						.catch(done);
				}
			});
		});

		it('should reload page if the state is null', function(done) {
			locator.unregister('documentRenderer');
			locator.registerInstance('documentRenderer', {
				render: () => done(new Error('Should not route')),
				initWithState: () => Promise.resolve()
			});
			locator.registerInstance('routeDefinition', '/some?first=:first[first]');
			eventBus.once('error', done);

			jsdom.env({
				url: 'http://local/wrong',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);
					window.location.reload = () => done();

					const router = new RequestRouter(locator);
				}
			});
		});

	});
});
