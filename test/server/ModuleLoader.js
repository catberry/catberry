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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

var assert = require('assert'),
	fs = require('fs'),
	path = require('path'),
	ServiceLocator = require('../../lib/ServiceLocator'),
	ModuleLoader = require('../../lib/server/ModuleLoader');

var CASES_DIRECTORY = path.join(__dirname, '..', 'cases',
	'server', 'ModuleLoader');

function createModuleLoader(caseName) {
	var fullPath = path.join(CASES_DIRECTORY, caseName),
		locator = new ServiceLocator(),
		config = {modulesFolder: fullPath};

	locator.register('serviceLocator', ServiceLocator, null, true);
	locator.register('logger', require('../mocks/Logger'));
	locator.register('templateProvider', require('../mocks/TemplateProvider'));
	locator.registerInstance('config', config);

	return locator.resolveInstance(ModuleLoader, config);
}

describe('ModuleLoader', function () {
	describe('#getModulesByNames', function () {
		it('should skip empty folders', function () {
			var case1Folder = path.join(CASES_DIRECTORY, 'case1'),
				emptyFolderPath = path.join(case1Folder, 'emptyFolder');

			// because git does not store empty folders we must create it.
			if (!fs.existsSync(case1Folder)) {
				fs.mkdirSync(case1Folder);
			}

			if (!fs.existsSync(emptyFolderPath)) {
				fs.mkdirSync(emptyFolderPath);
			}

			var moduleLoader = createModuleLoader('case1'),
				modules = moduleLoader.getModulesByNames(),
				counter = 0;

			for (var moduleName in modules) {
				if (modules.hasOwnProperty(moduleName)) {
					counter++;
				}
			}

			assert.equal(counter, 0, 'Too many loaded modules');
		});

		it('should throw error if module interface is incorrect', function () {
			var moduleLoader = createModuleLoader('case2');

			assert.throws(function () {
				moduleLoader.getModulesByNames();
			});
		});

		it('should skip module folders with wrong module names', function () {
			var moduleLoader = createModuleLoader('case3'),
				modules = moduleLoader.getModulesByNames(),
				counter = 0;

			for (var moduleName in modules) {
				if (modules.hasOwnProperty(moduleName)) {
					counter++;
				}
			}

			assert.equal(counter, 0, 'Too many loaded modules');
		});

		it('should properly load correct modules', function () {
			var moduleLoader = createModuleLoader('case4'),
				modules = moduleLoader.getModulesByNames(),
				counter = 0;

			for (var moduleName in modules) {
				if (modules.hasOwnProperty(moduleName)) {
					counter++;
				}
			}

			assert.equal(counter, 2, 'Not all modules were loaded');

			assert.equal('correctModule1' in modules, true,
				'correctModule1 not found');

			assert.equal('correctModule2' in modules, true,
				'correctModule2 not found');

			// check assets
			var firstModule = modules.correctModule1,
				secondModule = modules.correctModule2;

			// check placeholders
			var firstPlaceholders = firstModule.placeholders;
			counter = 0;
			for (var key1 in firstPlaceholders) {
				if (firstPlaceholders.hasOwnProperty(key1)) {
					counter++;
				}
			}
			assert.equal(counter, 1, 'Too many placeholders');
			assert.equal(firstModule.rootPlaceholder.name, '__index',
				'Wrong placeholder name');
			assert.equal(
					firstModule.rootPlaceholder.getTemplateStream instanceof
					Function, true,
				'Root placeholder not found');
			assert.equal(firstPlaceholders.placeholder1.name, 'placeholder1',
				'Wrong placeholder name');
			assert.equal(
					firstPlaceholders.placeholder1.getTemplateStream instanceof
					Function,
				true, 'Placeholder not found');

			var secondPlaceholders = secondModule.placeholders;
			counter = 0;

			for (var key2 in secondPlaceholders) {
				if (secondPlaceholders.hasOwnProperty(key2)) {
					counter++;
				}
			}
			assert.equal(counter, 2, 'Expect 2 placeholders');
			assert.deepEqual(secondModule.rootPlaceholder, undefined);
			assert.equal(secondPlaceholders.placeholder2.name, 'placeholder2',
				'Wrong placeholder name');
			assert.equal(
					secondPlaceholders.placeholder2.getTemplateStream instanceof
					Function,
				true,
				'Placeholder not found');
			assert.equal(secondPlaceholders.placeholder3.name, 'placeholder3',
				'Wrong placeholder name');
			assert.equal(
					secondPlaceholders.placeholder3.getTemplateStream instanceof
					Function,
				true,
				'Placeholder not found');
		});
	});
});