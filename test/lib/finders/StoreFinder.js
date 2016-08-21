'use strict';

const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const ncp = require('ncp').ncp;
const rimraf = require('rimraf');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const StoreFinder = require('../../../lib/finders/StoreFinder');
const promiseHelper = require('../../../lib/promises/promiseHelper');

const copy = promiseHelper.callbackToPromise(ncp);
const remove = promiseHelper.callbackToPromise(rimraf);
const writeFile = promiseHelper.callbackToPromise(fs.writeFile);
const readFile = promiseHelper.callbackToPromise(fs.readFile);
const mkdir = promiseHelper.callbackToPromise(fs.mkdir);

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
	let locator;

	beforeEach(() => {
		locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('eventBus', new events.EventEmitter());
		locator.register('storeFinder', StoreFinder);
	});

	describe('#find', () => {
		it('should find all valid stores', () => {
			locator.registerInstance('config', {
				storesDirectory: path.join(CASE_PATH, 'catberry_stores')
			});
			const finder = locator.resolve('storeFinder');

			return finder
				.find()
				.then(found => assert.deepEqual(found, EXPECTED));
		});
	});

	describe('#watch', () => {
		let finder, temporaryRoot;

		const caseRoot = path.join(CASE_PATH, 'watch');

		beforeEach(() => {
			temporaryRoot = getTemporaryPath();
			locator.registerInstance('config', {
				storesDirectory: temporaryRoot
			});
			finder = locator.resolve('storeFinder');
			return mkdir(temporaryRoot);
		});

		afterEach(() => {
			return Promise.all([finder.closeWatch(), remove(temporaryRoot)]);
		});

		it('should trigger add event when a new store appears', done => {
			const storePath = path.join(caseRoot, 'Store.js');
			const storeDestination = path.join(temporaryRoot, 'Store.js');

			finder.find()
				.then(() => finder.watch())
				.then(() => {
					finder.once('add', foundDescription => {
						assert.deepEqual(foundDescription, {
							name: 'Store',
							path: storeDestination
						});
						done();
					});

					return copy(storePath, storeDestination);
				})
				.catch(done);
		});

		it('should trigger unlink event when a store is removed', done => {
			const storePath = path.join(caseRoot, 'Store.js');
			const storeDestination = path.join(temporaryRoot, 'Store.js');

			finder.find()
				.then(() => copy(storePath, storeDestination))
				.then(() => finder.watch())
				.then(() => {
					finder.once('unlink', unlinkDescription => {
						assert.deepEqual(unlinkDescription, {
							name: 'Store',
							path: storeDestination
						});
						done();
					});

					return remove(storeDestination);
				})
				.catch(done);
		});

		it('should trigger change event when a store changed', done => {
			const storePath = path.join(caseRoot, 'Store.js');
			const storeDestination = path.join(temporaryRoot, 'Store.js');

			finder.find()
				.then(() => copy(storePath, storeDestination))
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changeDescription => {
						assert.deepEqual(changeDescription, {
							name: 'Store',
							path: storeDestination
						});
						done();
					});

					return readFile(storeDestination);
				})
				.then(file => {
					const modified = `${file}\nfunction() { }`;
					return writeFile(storeDestination, modified);
				})
				.catch(done);
		});

	});
});

function getTemporaryPath() {
	return path.join(CASE_PATH, `__tmp__${uuid.v4()}`);
}
