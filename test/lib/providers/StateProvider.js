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
	});
});

function createLocator(routeDefinitions) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	routeDefinitions.forEach(function(routeDefinition) {
		locator.registerInstance('routeDefinition', routeDefinition);
	});

	return locator;
}
