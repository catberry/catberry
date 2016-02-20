'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const Logger = require('../../mocks/Logger');
const ComponentFinder = require('../../../lib/finders/ComponentFinder');

const CASE_PATH = path.join(
	'test', 'cases', 'lib', 'finders', 'ComponentFinder'
);

const EXPECTED_PATH = path.join(
	process.cwd(), CASE_PATH, 'EXPECTED.json'
);
const EXPECTED = require(EXPECTED_PATH);

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe.only('lib/finders/ComponentFinder', function() {
	var locator;

	beforeEach(function() {
		locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('eventBus', new events.EventEmitter());
		locator.register('componentFinder', ComponentFinder);
		locator.register('logger', Logger);
	});

	describe('#find', function() {
		it('should find all valid components', function(done) {
			locator.registerInstance('config', {
				componentsGlob: 'test/**/test-cat-component.json'
			});
			const finder = locator.resolve('componentFinder');
			return finder
				.find()
				.then(found => foundEqualsExpected(found, EXPECTED))
				.then(done)
				.catch(done);
		});
		it('should find all valid components by globs array', function(done) {
			const caseRoot = 'test/cases/lib/finders/ComponentFinder/components';
			locator.registerInstance('config', {
				componentsGlob: [
					caseRoot + '/test1/**/test-cat-component.json',
					caseRoot + '/test1/test-cat-component.json',
					caseRoot + '/test3/**/test-cat-component.json',
					caseRoot + '/test3/test-cat-component.json'
				]
			});
			const finder = locator.resolve('componentFinder');
			return finder
				.find()
				.then(found => foundEqualsExpected(found, EXPECTED))
				.then(done)
				.catch(done);
		});
	});
});

function foundEqualsExpected(found, EXPECTED) {
	assert.strictEqual(found.size, Object.keys(EXPECTED).length);

	Object.keys(EXPECTED)
		.forEach(name => {
			assert.strictEqual(found.has(name), true);
			assert.strictEqual(found.get(name).name, EXPECTED[name].name);
			assert.strictEqual(found.get(name).path, EXPECTED[name].path);
			assert.deepEqual(found.get(name).properties, EXPECTED[name].properties);
		});
}
