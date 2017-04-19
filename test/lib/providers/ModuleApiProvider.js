'use strict';

const assert = require('assert');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const CookieWrapper = require('../../../lib/CookieWrapper');
const ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider');

const TYPE_CHECK_METHOD_NAMES = [
	'on',
	'once',
	'removeListener'
];

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/providers/ModuleApiProvider', function() {
	var locator, api;

	beforeEach(function() {
		locator = new ServiceLocator();

		locator.register('cookieWrapper', CookieWrapper);
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('stateProvider', {
			getRouteURI(name, parameters) {
				return `testURI:${name}:${JSON.stringify(parameters)}`;
			}
		});
		locator.registerInstance('eventBus', new events.EventEmitter());
		api = new ModuleApiProvider(locator);
	});

	describe('isBrowser', function() {
		it('should be false', function() {
			assert.strictEqual(api.isBrowser, false);
		});
	});

	describe('isServer', function() {
		it('should be true', function() {
			assert.strictEqual(api.isServer, true);
		});
	});

	describe('Proper type checks and exceptions', function() {
		TYPE_CHECK_METHOD_NAMES.forEach(methodName => {
			describe(`#${methodName}`, function() {
				it('should throw an error if the handler is not a function', function() {
					assert.throws(() => api[methodName]('some', {}));
				});

				it('should throw an error if the event name is not a string', function() {
					assert.throws(() => api[methodName]({}, function() {}));
				});
			});
		});
	});

	describe('#on', function() {
		it('should properly register a handler on the event', function(done) {
			const bus = locator.resolve('eventBus');

			api.on('event', arg => {
				assert.strictEqual(arg, 'hello');
				done();
			});
			bus.emit('event', 'hello');
		});
	});

	describe('#once', function() {
		it('should properly register a handler on the event', function(done) {
			const bus = locator.resolve('eventBus');

			var was = false;
			api.once('event', arg => {
				if (was) {
					assert.fail();
				}
				was = true;
				assert.strictEqual(arg, 'hello');
			});
			bus.emit('event', 'hello');
			assert.strictEqual(was, true);
			done();
		});
	});

	describe('#removeListener', function() {
		it('should properly remove a listener', function(done) {
			const bus = locator.resolve('eventBus');

			var was = false;
			const handler = () => (was = true);

			api.on('event', handler);
			api.removeListener('event', handler);
			bus.emit('event', 'hello');
			assert.strictEqual(was, false);
			done();
		});
	});

	describe('#removeAllListeners', function() {
		it('should throw an error if the event name is not a string', function() {
			assert.throws(() => api.removeAllListeners({}));
		});

		it('should properly remove all listeners', function(done) {
			const bus = locator.resolve('eventBus');

			var was = false;
			const handler1 = () => (was = true);
			const handler2 = () => (was = true);

			api.on('event', handler1);
			api.on('event', handler2);
			api.removeAllListeners('event');
			bus.emit('event', 'hello');
			assert.strictEqual(was, false);
			done();
		});
	});

	describe('#redirect', function(done) {
		it('should save the last redirected URI', function() {
			api.redirect('/some1')
				.then(() => api.redirect('/some2'))
				.then(() => assert.strictEqual(api.actions.redirectedTo, '/some2'))
				.then(done)
				.catch(done);
		});
	});

	describe('#error', function(done) {
		it('should return 500 HTTP status code', function() {
			api.error(500)
				.then(() => assert.strictEqual(api.actions.errorStatusCode, 500))
				.then(done)
				.catch(done);
		});
	});

	describe('#getRouteURI', function() {
		it('should call state provider', function() {
			assert.strictEqual(api.getRouteURI('name', {some: 'value'}), 'testURI:name:{"some":"value"}');
		});
	});

	describe('#clearFragment', function(done) {
		it('should save flag that hash has been cleared', function() {
			assert.strictEqual(api.actions.isFragmentCleared, false);
			api.clearFragment()
				.then(() => assert.strictEqual(api.actions.isFragmentCleared, true))
				.then(done)
				.catch(done);
		});
	});

	describe('#getInlineScript', function() {
		it('should return browser script for redirection', function(done) {
			const expected = '<script>window.location.assign(\'http://some\');</script>';

			api.redirect('http://some')
				.then(() => assert.strictEqual(api.getInlineScript(), expected))
				.then(done)
				.catch(done);
		});

		it('should return browser script for cookies', function(done) {
			const expected = '<script>' +
				'window.document.cookie = \'some1=value1\';' +
				'window.document.cookie = \'some2=value2\';' +
				'</script>';

			api.cookie.set({
				key: 'some1',
				value: 'value1'
			});
			api.cookie.set({
				key: 'some2',
				value: 'value2'
			});

			assert.strictEqual(api.getInlineScript(), expected);
			done();
		});

		it('should return browser script for clearing fragment', function(done) {
			const expected = '<script>' +
				'window.location.hash = \'\';' +
				'</script>';

			api.clearFragment()
				.then(() => assert.strictEqual(api.getInlineScript(), expected))
				.then(done)
				.catch(done);
		});
	});
});
