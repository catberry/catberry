'use strict';

const assert = require('assert');
const fs = require('fs-extra');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const ComponentFinder = require('../../../lib/finders/ComponentFinder');
const promiseHelper = require('../../../lib/promises/promiseHelper');

const copy = promiseHelper.callbackToPromise(fs.copy);
const remove = promiseHelper.callbackToPromise(fs.remove);
const writeFile = promiseHelper.callbackToPromise(fs.writeFile);
const readFile = promiseHelper.callbackToPromise(fs.readFile);

const CASE_PATH = path.join(
	'test', 'cases', 'lib', 'finders', 'ComponentFinder'
);
const CASE_COMPONENTS_PATH = path.join(CASE_PATH, 'components');

const EXPECTED_PATH = path.join(
	process.cwd(), CASE_PATH, 'expected.json'
);
const EXPECTED = require(EXPECTED_PATH);

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/finders/ComponentFinder', () => {
	let locator;

	beforeEach(() => {
		locator = new ServiceLocator();
		locator.registerInstance('serviceLocator', locator);
		locator.registerInstance('eventBus', new events.EventEmitter());
		locator.register('componentFinder', ComponentFinder);
	});

	describe('#find', () => {
		it('should find all valid components', () => {
			locator.registerInstance('config', {
				componentsGlob: `${CASE_COMPONENTS_PATH}/**/test-cat-component.json`
			});

			const finder = locator.resolve('componentFinder');

			return finder
				.find()
				.then(found => assert.deepEqual(found, EXPECTED));
		});

		it('should find all valid components by globs array', () => {
			locator.registerInstance('config', {
				componentsGlob: [
					`${CASE_COMPONENTS_PATH}/test1/**/test-cat-component.json`,
					`${CASE_COMPONENTS_PATH}/test1/test-cat-component.json`,
					`${CASE_COMPONENTS_PATH}/test3/**/test-cat-component.json`,
					`${CASE_COMPONENTS_PATH}/test3/test-cat-component.json`
				]
			});

			const finder = locator.resolve('componentFinder');

			return finder
				.find()
				.then(found => assert.deepEqual(found, EXPECTED));
		});
	});

	describe('#watch', () => {
		it('should to notice the appearance of a new component and add it', () => {
			const temporaryRoot = getTemporaryPath();
			const caseRoot = path.join(CASE_PATH, 'watch');
			const insidePath = path.join(caseRoot, 'inside');
			const anotherPath = path.join(caseRoot, 'another');

			locator.registerInstance('config', {
				componentsGlob: `${temporaryRoot}/**/test-cat-component.json`
			});

			const finder = locator.resolve('componentFinder');

			return copy(insidePath, temporaryRoot)
				.then(() => finder.find())
				.then(found => {
					assert.equal(Object.keys(found).length, 1);

					return finder.watch();
				})
				.then(watchers => {
					const finderOn = promiseHelper.callbackToPromise(finder.on, {thisArg: finder, ignoreError: true});
					const promise = finderOn('add')
						.then(component => {
							assert.equal(component.name, 'another');
							return finder.find();
						});

					return Promise.all([promise, copy(anotherPath, path.join(temporaryRoot, 'another'))]);
				})
				.then(data => {
					assert.equal(Object.keys(data[0]).length, 2);

					return Promise.all([finder.closeWatch(), remove(temporaryRoot)]);
				})
				.catch(reason => {
					Promise.all([finder.closeWatch(), remove(temporaryRoot)]);

					throw reason;
				});
		});

		it('should to notice the change in the component.json and should to rebuild it.', () => {
			const temporaryRoot = getTemporaryPath();
			const caseRoot = path.join(CASE_PATH, 'watch');
			const insidePath = path.join(caseRoot, 'inside');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			locator.registerInstance('config', {
				componentsGlob: `${temporaryRoot}/**/test-cat-component.json`
			});

			const finder = locator.resolve('componentFinder');

			return copy(insidePath, temporaryRoot)
				.then(() => finder.find())
				.then(found => {
					assert.equal(Object.keys(found).length, 1);

					return finder.watch();
				})
				.then(() => {
					const finderOn = promiseHelper.callbackToPromise(finder.on, {thisArg: finder, ignoreError: true});
					const promise = Promise.all([finderOn('unlink'), finderOn('add')])
						.then(data => {
							const component = data[1];
							assert.equal(component.name, 'inside');
							assert.equal(component.properties.blablabla, 'foo');

							return finder.find();
						});

					const changeFilePromise = readFile(catComponent)
						.then(content => {
							content = JSON.parse(content);
							content.blablabla = 'foo';

							return writeFile(catComponent, JSON.stringify(content));
						});

					return Promise.all([promise, changeFilePromise]);
				})
				.then(() => Promise.all([finder.closeWatch(), remove(temporaryRoot)]))
				.catch(reason => {
					Promise.all([finder.closeWatch(), remove(temporaryRoot)]);

					throw reason;
				});
		});

		it('should to notice the change in the logic and should to rebuild it.', () => {
			const temporaryRoot = getTemporaryPath();
			const caseRoot = path.join(CASE_PATH, 'watch');
			const anotherPath = path.join(caseRoot, 'another');
			const catLogic = path.join(temporaryRoot, 'index.js');

			locator.registerInstance('config', {
				componentsGlob: `${temporaryRoot}/**/test-cat-component.json`
			});

			const finder = locator.resolve('componentFinder');

			return copy(anotherPath, temporaryRoot)
				.then(() => finder.find())
				.then(found => {
					assert.equal(Object.keys(found).length, 1);

					return finder.watch();
				})
				.then(() => {
					const finderOn = promiseHelper.callbackToPromise(finder.on, {thisArg: finder, ignoreError: true});
					const promise = finderOn('change')
						.then(data => {
							assert.equal(data.component.name, 'another');

							const Logic = require(path.join(process.cwd(), temporaryRoot));

							assert.equal((new Logic()).bar(), 'foo');

							return finder.find();
						});

					const changeFilePromise = readFile(catLogic)
						.then(content => {
							content = content.toString();
							content = content.replace(/arr/, 'foo');

							return writeFile(catLogic, content);
						});

					return Promise.all([promise, changeFilePromise]);
				})
				.then(() => Promise.all([finder.closeWatch(), remove(temporaryRoot)]))
				.catch(reason => {
					Promise.all([finder.closeWatch(), remove(temporaryRoot)]);

					throw reason;
				});
		});
	});
});

function getTemporaryPath() {
	return path.join(CASE_PATH, `__tmp__${Date.now()}`);
}
