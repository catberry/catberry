'use strict';

const assert = require('assert');
const fs = require('fs');
const uuid = require('uuid');
const ncp = require('ncp').ncp;
const rimraf = require('rimraf');
const path = require('path');
const events = require('events');
const ServiceLocator = require('catberry-locator');
const ComponentFinder = require('../../../lib/finders/ComponentFinder');
const promiseHelper = require('../../../lib/promises/promiseHelper');

const copy = promiseHelper.callbackToPromise(ncp);
const remove = promiseHelper.callbackToPromise(rimraf);
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
		let finder, temporaryRoot;

		const caseRoot = path.join(CASE_PATH, 'watch');

		beforeEach(() => {
			temporaryRoot = getTemporaryPath();
			locator.registerInstance('config', {
				componentsGlob: `${temporaryRoot}/**/test-cat-component.json`
			});
			finder = locator.resolve('componentFinder');
		});

		afterEach(() => {
			return Promise.all([finder.closeWatch(), remove(temporaryRoot)]);
		});

		it('should trigger add event when a new component appears', done => {
			const insidePath = path.join(caseRoot, 'inside');
			const anotherPath = path.join(caseRoot, 'another');
			const anotherDestination = path.join(temporaryRoot, 'another');

			copy(insidePath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('add', foundDescription => {
						assert.deepEqual(foundDescription, {
							name: 'another',
							path: path.join(anotherDestination, 'test-cat-component.json'),
							properties: {
								name: 'another',
								logic: './index.js',
								template: 'test1.html',
								errorTemplate: 'error.html',
								additional: 'some'
							}
						});
						done();
					});

					return copy(anotherPath, anotherDestination);
				})
				.catch(done);
		});

		it('should trigger unlink/add events when component.json is changed', done => {
			const insidePath = path.join(caseRoot, 'inside');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(insidePath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					let isUnlinked = false;
					finder.once('unlink', unlinkedDescription => {
						assert.deepEqual(unlinkedDescription, {
							name: 'inside',
							path: catComponent,
							properties: {
								name: 'Inside',
								logic: './logic.js',
								template: 'cool.html',
								additional: 'some2'
							}
						});
						isUnlinked = true;
					});

					finder.once('add', foundDescription => {
						assert.deepEqual(foundDescription, {
							name: 'inside',
							path: catComponent,
							properties: {
								name: 'Inside',
								logic: './logic.js',
								template: 'cool.html',
								additional: 'newImportantValue'
							}
						});
						assert.strictEqual(isUnlinked, true);
						done();
					});

					return readFile(catComponent);
				})
				.then(file => {
					const content = JSON.parse(file);
					content.additional = 'newImportantValue';
					return writeFile(catComponent, JSON.stringify(content));
				})
				.catch(done);
		});

		it('should trigger unlink events when component.json is removed', done => {
			const insidePath = path.join(caseRoot, 'inside');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(insidePath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('unlink', unlinkedDescription => {
						assert.deepEqual(unlinkedDescription, {
							name: 'inside',
							path: catComponent,
							properties: {
								name: 'Inside',
								logic: './logic.js',
								template: 'cool.html',
								additional: 'some2'
							}
						});
						done();
					});

					return remove(catComponent);
				})
				.catch(done);
		});

		it('should trigger change event when a JavaScript file of the component changes', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catLogic = path.join(temporaryRoot, 'index.js');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catLogic,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});

					return readFile(catLogic);
				})
				.then(file => {
					const modified = `${file}\nfunction() {}`;
					return writeFile(catLogic, modified);
				})
				.catch(done);
		});

		it('should trigger change event when a template file of the component changes', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catTemplate = path.join(temporaryRoot, 'test1.html');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catTemplate,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});

					return readFile(catTemplate);
				})
				.then(file => {
					const modified = `${file}\n<h1>Hi!</h1>`;
					return writeFile(catTemplate, modified);
				})
				.catch(done);
		});

		it('should trigger change event when an error template file of the component changes', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catTemplate = path.join(temporaryRoot, 'error.html');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catTemplate,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});

					return readFile(catTemplate);
				})
				.then(file => {
					const modified = `${file}\n<h1>Hi!</h1>`;
					return writeFile(catTemplate, modified);
				})
				.catch(done);
		});

		it('should trigger change event when a JavaScript file is removed', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catLogic = path.join(temporaryRoot, 'index.js');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catLogic,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});
					return remove(catLogic);
				})
				.catch(done);
		});

		it('should trigger change event when a template file is removed', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catTemplate = path.join(temporaryRoot, 'test1.html');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catTemplate,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});
					return remove(catTemplate);
				})
				.catch(done);
		});

		it('should trigger change event when an error template file is removed', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catTemplate = path.join(temporaryRoot, 'error.html');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catTemplate,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});
					return remove(catTemplate);
				})
				.catch(done);
		});

		it('should trigger change event when a file appears in the component directory', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catFile = path.join(temporaryRoot, 'file.html');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catFile,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});
					return writeFile(catFile, 'some');
				})
				.catch(done);
		});

		it('should trigger change event when a file changes in the component directory', done => {
			const componentPath = path.join(caseRoot, 'another');
			const catFile = path.join(temporaryRoot, 'just-file.html');
			const catComponent = path.join(temporaryRoot, 'test-cat-component.json');

			copy(componentPath, temporaryRoot)
				.then(() => finder.find())
				.then(() => finder.watch())
				.then(() => {
					finder.once('change', changedArgs => {
						assert.deepEqual(changedArgs, {
							filename: catFile,
							component: {
								name: 'another',
								path: catComponent,
								properties: {
									name: 'another',
									logic: './index.js',
									template: 'test1.html',
									errorTemplate: 'error.html',
									additional: 'some'
								}
							}
						});
						done();
					});
					return readFile(catFile);
				})
				.then(file => {
					const modified = `${file}\n<h1>Hi!</h1>`;
					return writeFile(catFile, modified);
				})
				.catch(done);
		});

	});
});

function getTemporaryPath() {
	return path.join(CASE_PATH, `__tmp_${uuid.v4()}`);
}
