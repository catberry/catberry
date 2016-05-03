'use strict';

const assert = require('assert');
const events = require('events');
const jsdom = require('jsdom');
const UniversalMock = require('../../mocks/UniversalMock');
const ServiceLocator = require('catberry-locator');
const ModuleApiProvider = require('../../../browser/providers/ModuleApiProvider');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/providers/ModuleApiProvider', function() {
	var locator, api, requestRouter;
	beforeEach(function() {
		locator = createLocator();
		api = new ModuleApiProvider(locator);
		requestRouter = locator.resolve('requestRouter');
	});

	describe('isBrowser', function() {
		it('should be true', function() {
			assert.strictEqual(api.isBrowser, true);
		});
	});

	describe('isServer', function() {
		it('should be false', function() {
			assert.strictEqual(api.isServer, false);
		});
	});

	describe('#redirect', function() {
		it('should redirect to URI', function(done) {
			requestRouter.on('go', function(args) {
				assert.strictEqual(args[0], '/some1');
				done();
			});
			assert.strictEqual(api.redirect('/some1') instanceof Promise, true);
		});
	});

	describe('#getRouteURI', function() {
		it('should call state provider', function() {
			assert.strictEqual(api.getRouteURI('name', {some: 'value'}), 'testURI:name:{"some":"value"}');
		});
	});

	describe('#clearFragment', function() {
		it('should clear URI hash', function(done) {
			requestRouter.on('clearFragment', function(args) {
				assert.strictEqual(args.length, 0);
			});
			jsdom.env({
				url: 'http://local',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);

					window.location.hash = '#some';
					assert.strictEqual(window.location.toString(), 'http://local/#some');
					api.clearFragment()
						.then(() => assert.strictEqual(window.location.toString(), 'http://local/'))
						.then(done)
						.catch(done);
				}
			});
		});
	});

	describe('#notFound', function() {
		it('should reload the page', function(done) {
			jsdom.env({
				url: 'http://local',
				html: ' ',
				done: (errors, window) => {
					locator.registerInstance('window', window);

					window.location.reload = () => done();
					api.notFound()
						.catch(done);
				}
			});
		});
	});
});

function createLocator() {
	const locator = new ServiceLocator();

	const requestRouter = new UniversalMock([
		'go', 'clearFragment'
	]);
	requestRouter.decorateMethod('go', () => Promise.resolve());
	locator.registerInstance('requestRouter', requestRouter);
	locator.registerInstance('stateProvider', {
		getRouteURI(name, parameters) {
			return `testURI:${name}:${JSON.stringify(parameters)}`;
		}
	});

	const templateProvider = new UniversalMock(['render']);
	templateProvider.decorateMethod('render', () => Promise.resolve());
	locator.registerInstance('cookieWrapper', {
		get: () => {},
		set: () => {}
	});
	locator.registerInstance('templateProvider', templateProvider);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('eventBus', new events.EventEmitter());

	return locator;
}
