'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const StoreFinder = require('../../../lib/finders/StoreFinder');

const CASE_PATH = path.join(
	'test', 'cases', 'lib', 'finders', 'StoreFinder'
);

const EXPECTED_PATH = path.join(
	process.cwd(), CASE_PATH, 'expected.json'
);
const EXPECTED = require(EXPECTED_PATH);

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/finders/StoreFinder', function() {
	var locator;

	beforeEach(function() {
		locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('eventBus', new events.EventEmitter());
		locator.register('storeFinder', StoreFinder);
	});

	describe('#find', function() {
		it('should find all valid stores', function(done) {
			locator.registerInstance('config', {
				storesDirectory: path.join(CASE_PATH, 'catberry_stores')
			});
			const finder = locator.resolve('storeFinder');

			finder
				.find()
				.then(found => assert.deepEqual(found, EXPECTED))
				.then(done)
				.catch(done);
		});
	});
});
