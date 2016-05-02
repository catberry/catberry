'use strict';

const assert = require('assert');
const events = require('events');
const URI = require('catberry-uri').URI;
const testCases = require('../../cases/lib/providers/StateProvider.json');
const RouterParser = require('../../../lib/tokenizers/RouteParser');
const routeParser = new RouterParser();
const ServiceLocator = require('catberry-locator');
const StateProvider = require('../../../browser/providers/StateProvider');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/providers/StateProvider', function() {
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
	});
});

function createLocator(routeDefinitions) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	routeDefinitions.forEach(routeDefinition => {
		locator.registerInstance('routeDefinition', routeDefinition);
		if (typeof (routeDefinition) === 'string') {
			locator.registerInstance('routeDescriptor', routeParser.parseRouteExpression(routeDefinition));
			return;
		}
		if (typeof (routeDefinition) === 'object' && typeof (routeDefinition.expression) === 'string') {
			routeDefinition.map = state => state;
			locator.registerInstance('routeDescriptor', routeParser.parseRouteExpression(routeDefinition.expression));
		}
	});

	return locator;
}
