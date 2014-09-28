/*
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software,
 * and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	events = require('events'),
	fs = require('fs'),
	path = require('path'),
	ServiceLocator = require('catberry-locator'),
	ContextFactory = require('../../lib/ContextFactory'),
	ContentReadable = require('../../lib/streams/ContentReadable'),
	Logger = require('../mocks/Logger'),
	ModuleApiProvider = require('../../lib/ModuleApiProvider'),
	CookiesWrapper = require('../../lib/CookiesWrapper'),
	ModuleFinder = require('../../lib/ModuleFinder'),
	ModuleLoader = require('../../lib/ModuleLoader');

global.Promise = require('promise');

var CASES_DIRECTORY = path.join(__dirname, '..', 'cases',
	'server', 'ModuleLoader');

function createModuleLoader(caseName) {
	var fullPath = path.join(CASES_DIRECTORY, caseName),
		locator = new ServiceLocator(),
		config = {modulesFolder: fullPath};

	locator.register('logger', Logger);
	locator.register('moduleFinder', ModuleFinder, config, true);
	locator.register('moduleApiProvider', ModuleApiProvider, config);
	locator.register('cookiesWrapper', CookiesWrapper, config);
	locator.register('contextFactory', ContextFactory);
	locator.registerInstance('config', config);
	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('templateProvider', {
		compile: function () {

		},
		registerCompiled: function () {

		},
		getStream: function (name, context) {
			return new ContentReadable(name + JSON.stringify(context));
		}
	});

	return locator.resolveInstance(ModuleLoader, config);
}

describe('lib/ModuleLoader', function () {
	describe('#getModulesByNames', function () {
		it('should skip empty folders', function (done) {
			var case1Folder = path.join(CASES_DIRECTORY, 'case1'),
				emptyFolderPath = path.join(case1Folder, 'emptyFolder');

			// because git does not store empty folders we must create it.
			if (!fs.existsSync(case1Folder)) {
				fs.mkdirSync(case1Folder);
			}

			if (!fs.existsSync(emptyFolderPath)) {
				fs.mkdirSync(emptyFolderPath);
			}

			var moduleLoader = createModuleLoader('case1');
			moduleLoader.loadModules().then(function (modules) {
				var counter = 0;

				for (var moduleName in modules) {
					if (modules.hasOwnProperty(moduleName)) {
						counter++;
					}
				}

				assert.equal(counter, 0, 'Too many loaded modules');
			})
				.then(function () {
					done();
				}, function (reason) {
					done(reason);
				});
		});

		it('should not throw error if module interface is incorrect',
			function (done) {
				var moduleLoader = createModuleLoader('case2');
				moduleLoader.loadModules()
					.then(function () {
						done();
					}, function (reason) {
						done(reason);
					});
			});

		it('should load only placeholders if module syntax is incorrect',
			function (done) {
				var moduleLoader = createModuleLoader('case5');
				moduleLoader._eventBus.on('error', function (error) {
					assert.strictEqual(error instanceof SyntaxError, true);
				});
				moduleLoader.loadModules()
					.then(function (modules) {
						assert.strictEqual(Object.keys(modules).length, 1);
						var placeholders = modules.wrongSyntax.placeholders;
						assert.strictEqual(Object.keys(placeholders).length, 1);
						assert.strictEqual(typeof(placeholders.only), 'object');
						assert.strictEqual(
								placeholders.only.getTemplateStream instanceof
								Function, true
						);
					})
					.then(function () {
						done();
					}, function (reason) {
						done(reason);
					});
			});

		it('should skip module folders with wrong module names',
			function (done) {
				var moduleLoader = createModuleLoader('case3');
				moduleLoader.loadModules().then(function (modules) {
					var counter = 0;

					for (var moduleName in modules) {
						if (modules.hasOwnProperty(moduleName)) {
							counter++;
						}
					}

					assert.equal(counter, 0, 'Too many loaded modules');
				})
					.then(function () {
						done();
					}, function (reason) {
						done(reason);
					});
			});

		it('should properly load correct modules', function (done) {
			var moduleLoader = createModuleLoader('case4');

			moduleLoader.loadModules().then(function () {
				var modules = moduleLoader.getModulesByNames();
				assert.equal(Object.keys(modules).length, 3,
					'Not all modules were loaded');

				assert.equal('correctModule1' in modules, true,
					'correctModule1 not found');

				assert.equal('correctModule2' in modules, true,
					'correctModule2 not found');

				assert.equal('correctModule3' in modules, true,
					'correctModule2 not found');

				// check assets
				var firstModule = modules.correctModule1,
					secondModule = modules.correctModule2,
					thirdModule = modules.correctModule3;

				// check placeholders
				var firstPlaceholders = firstModule.placeholders;

				assert.equal(Object.keys(firstPlaceholders).length, 1,
					'Wrong count of placeholders');
				assert.equal(firstModule.rootPlaceholder.name, '__index',
					'Wrong placeholder name');
				assert.equal(firstModule.errorPlaceholder.name, '__error',
					'Wrong placeholder name');
				assert.equal(
						firstModule.rootPlaceholder.getTemplateStream instanceof
						Function, true,
					'Root placeholder not found');
				assert.equal(
						firstModule.errorPlaceholder.getTemplateStream instanceof
						Function, true,
					'Error placeholder not found');
				assert.equal(firstPlaceholders.placeholder1.name,
					'placeholder1',
					'Wrong placeholder name');
				assert.equal(
						firstPlaceholders
							.placeholder1
							.getTemplateStream instanceof Function,
					true, 'Placeholder not found');

				var secondPlaceholders = secondModule.placeholders;

				assert.equal(Object.keys(secondPlaceholders).length, 2,
					'Expect 2 placeholders');
				assert.strictEqual(secondModule.rootPlaceholder, undefined);
				assert.strictEqual(secondModule.errorPlaceholder, undefined);
				assert.equal(secondPlaceholders.placeholder2.name,
					'placeholder2',
					'Wrong placeholder name');
				assert.equal(
						secondPlaceholders
							.placeholder2
							.getTemplateStream instanceof Function,
					true,
					'Placeholder not found');
				assert.equal(secondPlaceholders.placeholder3.name,
					'placeholder3',
					'Wrong placeholder name');
				assert.equal(
						secondPlaceholders
							.placeholder3
							.getTemplateStream instanceof Function,
					true,
					'Placeholder not found');

				var thirdPlaceholders = thirdModule.placeholders;

				assert.equal(Object.keys(thirdPlaceholders).length, 1,
					'Expect 1 placeholders');
				assert.strictEqual(thirdModule.rootPlaceholder, undefined);
				assert.strictEqual(thirdModule.errorPlaceholder, undefined);
				assert.equal(thirdPlaceholders.placeholder4.name,
					'placeholder4',
					'Wrong placeholder name');
				assert.equal(
						thirdPlaceholders
							.placeholder4
							.getTemplateStream instanceof Function,
					true,
					'Placeholder not found');
				var dc = {hello: 'world'};
				return new Promise(function (fulfill, reject) {
					var stream = thirdPlaceholders.placeholder4
						.getTemplateStream({hello: 'world'});

					var result = '';
					stream
						.on('data', function (chunk) {
							result += chunk;
						})
						.on('error', function (error) {
							reject(error);
						})
						.on('end', function () {
							try {
								assert.strictEqual(
									result, thirdPlaceholders
										.placeholder4.fullName +
										JSON.stringify(dc)
								);
							} catch (e) {
								reject(e);
							}
							fulfill();
						});
				});
			})
				.then(function () {
					done();
				}, function (reason) {
					done(reason);
				});
		});
	});

	describe('#getPlaceholdersByIds', function () {
		it('should return empty object if modules not loaded yet',
			function (done) {
				var moduleLoader = createModuleLoader('case1'),
					placeholders = moduleLoader.getPlaceholdersByIds();
				assert.strictEqual(Object.keys(placeholders).length, 0);
				done();
			});

		it('should return empty object if modules list is empty',
			function (done) {
				var moduleLoader = createModuleLoader('case1');

				moduleLoader.loadModules()
					.then(function () {
						var placeholders = moduleLoader.getPlaceholdersByIds();
						assert.strictEqual(Object.keys(placeholders).length, 0);
					})
					.then(function () {
						done();
					}, function (reason) {
						done(reason);
					});
			});

		it('should return proper list of placeholders', function (done) {
			var moduleLoader = createModuleLoader('case4');

			moduleLoader.loadModules()
				.then(function () {
					var placeholders = moduleLoader.getPlaceholdersByIds();
					assert.strictEqual(Object.keys(placeholders).length, 4);
					assert.strictEqual(
							'correctModule1_placeholder1' in placeholders, true
					);
					assert.strictEqual(
							'correctModule2_placeholder2' in placeholders, true
					);
					assert.strictEqual(
							'correctModule2_placeholder3' in placeholders, true
					);
					assert.strictEqual(
							'correctModule3_placeholder4' in placeholders, true
					);
				})
				.then(function () {
					done();
				}, function (reason) {
					done(reason);
				});
		});
	});
});