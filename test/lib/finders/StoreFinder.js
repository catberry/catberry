'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const Logger = require('../../mocks/Logger');
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
		locator.register('logger', Logger);
	});

	describe('#find', function() {
		it('should find all valid stores', function(done) {
			locator.registerInstance('config',{
				storesDirectory: path.join(CASE_PATH, 'catberry_stores')
			});
			const finder = locator.resolve('storeFinder');

			finder
				.find()
				.then(foundEqualsExpected)
				.then(done)
				.catch(done);
		});
	});
});

function foundEqualsExpected(found) {
	assert.strictEqual(found.size, Object.keys(EXPECTED).length);
	Object.keys(EXPECTED)
		.forEach(name => {
			assert.strictEqual(found.has(name), true);
			assert.strictEqual(found.get(name).name, EXPECTED[name].name);
			assert.strictEqual(found.get(name).path, EXPECTED[name].path);
		});
}
