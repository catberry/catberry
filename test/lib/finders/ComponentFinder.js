'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const ComponentFinder = require('../../../lib/finders/ComponentFinder');

const CASE_PATH = path.join(
	'test', 'cases', 'lib', 'finders', 'ComponentFinder'
);

const EXPECTED_PATH = path.join(
	process.cwd(), CASE_PATH, 'expected.json'
);
const EXPECTED = require(EXPECTED_PATH);

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/finders/ComponentFinder', function() {
	var locator;

	beforeEach(function() {
		locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('eventBus', new events.EventEmitter());
		locator.register('componentFinder', ComponentFinder);
	});

	describe('#find', function() {
		it('should find all valid components', function(done) {
			locator.registerInstance('config', {
				componentsGlob: 'test/**/test-cat-component.json'
			});
			const finder = locator.resolve('componentFinder');
			return finder
				.find()
				.then(found => assert.deepEqual(found, EXPECTED))
				.then(done)
				.catch(done);
		});
		it('should find all valid components by globs array', function(done) {
			const caseRoot = 'test/cases/lib/finders/ComponentFinder/components';
			locator.registerInstance('config', {
				componentsGlob: [
					`${caseRoot}/test1/**/test-cat-component.json`,
					`${caseRoot}/test1/test-cat-component.json`,
					`${caseRoot}/test3/**/test-cat-component.json`,
					`${caseRoot}/test3/test-cat-component.json`
				]
			});
			const finder = locator.resolve('componentFinder');
			return finder
				.find()
				.then(found => assert.deepEqual(found, EXPECTED))
				.then(done)
				.catch(done);
		});
	});
});
