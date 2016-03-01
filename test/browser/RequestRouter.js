'use strict';

const assert = require('assert');
const events = require('events');
const jsdom = require('jsdom');
const Logger = require('../mocks/Logger');
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
		locator.register('logger', Logger);
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

	describe('#route', function() {
		testCases.route.forEach(testCase => clickTest(testCase));
	});
});
