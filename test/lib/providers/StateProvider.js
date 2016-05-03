'use strict';

const assert = require('assert');
const events = require('events');
const URI = require('catberry-uri').URI;
const testCases = require('../../cases/lib/providers/StateProvider.json');
const ServiceLocator = require('catberry-locator');
const StateProvider = require('../../../lib/providers/StateProvider');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/providers/StateProvider', function() {
	describe('#getStateByUri', function() {
		testCases.getStateByUri.forEach(testCase => {

			it(testCase.name, function() {
				const locator = createLocator(testCase.routes);
				const provider = new StateProvider(locator);
				const uri = new URI(testCase.uri);
				const state = provider.getStateByUri(uri);
				assert.deepEqual(state, testCase.expectedState);
			});
		});

		it('should get the state using regular expression', function() {
			const locator = createLocator([
				{
					expression: /^\/some\/(.+)$/i,
					map: uri => {
						return {
							param: uri.path
						};
					}
				}
			]);
			const provider = new StateProvider(locator);
			const uri = new URI('/some/value');
			const state = provider.getStateByUri(uri);
			assert.deepEqual(state, {
				param: '/some/value'
			});
		});

		it('should throw an error in case of wrong syntax', function() {
			const locator = createLocator([
				'/:wrong[some'
			]);
			assert.throws(() => {
				const provider = new StateProvider(locator);
			}, /Illegal/);
		});
	});

	describe('#getRouteURI', function() {
		testCases.getRouteURI.forEach(testCase => {

			it(testCase.name, function() {
				const locator = createLocator(testCase.routes);
				const provider = new StateProvider(locator);

				if (testCase.expectedError) {
					assert.throws(
						() => provider.getRouteURI(testCase.arguments.name, testCase.arguments.parameters),
						error => error.message === testCase.expectedError
					);
				} else {
					const uri = provider.getRouteURI(testCase.arguments.name, testCase.arguments.parameters);
					assert.strictEqual(uri, testCase.expectedURI);
				}
			});
		});
	});
});

function createLocator(routeDefinitions) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	routeDefinitions.forEach(function(routeDefinition) {
		if (typeof (routeDefinition) === 'object' && typeof (routeDefinition.expression) === 'string') {
			routeDefinition.map = state => state;
		}
		locator.registerInstance('routeDefinition', routeDefinition);
	});

	return locator;
}
