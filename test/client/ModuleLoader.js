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
	events = require('events'),
	Logger = require('../mocks/Logger'),
	ServiceLocator = require('catberry-locator'),
	UniversalMock = require('../mocks/UniversalMock'),
	StateProvider = require('../../lib/StateProvider'),
	CookiesWrapper = require('../../lib/client/CookiesWrapper'),
	ModuleLoader = require('../../lib/client/ModuleLoader');

function Module1() {}
function Module2() {}

var modules = [
	{
		name: 'module1',
		implementation: Module1
	},
	{
		name: 'module2',
		implementation: Module2
	}
];
var placeholders = [
	{
		moduleName: 'module1',
		name: 'placeholder1',
		compiledSource: 'source1'
	},
	{
		moduleName: 'module1',
		name: 'placeholder2',
		compiledSource: 'source2'
	},
	{
		moduleName: 'module1',
		name: '__index',
		compiledSource: 'source3'
	},
	{
		moduleName: 'module1',
		name: '__error',
		compiledSource: 'source4'
	},
	{
		moduleName: 'module2',
		name: 'placeholder1',
		compiledSource: 'source1'
	},
	{
		moduleName: 'module2',
		name: 'placeholder2',
		compiledSource: 'source2'
	}
];

describe('client/ModuleLoader', function () {
	describe('#getModulesByNames', function () {
		it('should load all modules and placeholders from Service Locator',
			function () {
				var locator = new ServiceLocator();
				locator.registerInstance('serviceLocator', locator);
				locator.registerInstance('eventBus', new events.EventEmitter());
				locator.registerInstance('config', {});
				locator.registerInstance('window', {
					location: '',
					document: {
						cookies: ''
					}
				});
				locator.registerInstance('templateProvider',
					new UniversalMock(['registerCompiled']));
				locator.register('cookiesWrapper', CookiesWrapper);
				locator.register('stateProvider', StateProvider);
				locator.register('logger', Logger);

				modules.forEach(function (module) {
					locator.registerInstance('module', module);
				});

				placeholders.forEach(function (placeholder) {
					locator.registerInstance('placeholder', placeholder);
				});

				var moduleLoader = locator.resolveInstance(ModuleLoader),
					modulesByNames = moduleLoader.getModulesByNames();

				assert.strictEqual(Object.keys(modulesByNames).length, 2,
					'Should be 2 modules');
				assert.strictEqual(modulesByNames.hasOwnProperty('module1'),
					true,
					'Should have module1 in set');
				assert.strictEqual(modulesByNames.hasOwnProperty('module2'),
					true,
					'Should have module2 in set');
				assert.strictEqual(modulesByNames.module1.name, 'module1',
					'Wrong module name');
				assert.strictEqual(modulesByNames.module2.name, 'module2',
					'Wrong module name');
				assert.strictEqual(
						modulesByNames.module1.implementation instanceof
						Module1, true,
					'Wrong module implementation');
				assert.strictEqual(
						modulesByNames.module2.implementation instanceof
						Module2, true,
					'Wrong module implementation');

				// check contexts
				checkContexts(modulesByNames);

				// check module 1 placeholders
				var module1Placeholders = modulesByNames.module1.placeholders;
				assert.strictEqual(typeof(module1Placeholders), 'object',
					'Placeholders set should be an object');
				assert.strictEqual(
					module1Placeholders.hasOwnProperty('placeholder1'), true,
					'Should have placeholder1 in set');
				assert.strictEqual(
					module1Placeholders.hasOwnProperty('placeholder2'), true,
					'Should have placeholder2 in set');
				assert.strictEqual(
					modulesByNames.module1.hasOwnProperty('rootPlaceholder'),
					false,
					'module1 should not have root placeholder at client-side'
				);
				assert.strictEqual(
					modulesByNames.module1.hasOwnProperty('errorPlaceholder'),
					true, 'module1 should have error placeholder'
				);
				assert.strictEqual(module1Placeholders.placeholder1.name,
					'placeholder1', 'Wrong placeholder name');
				assert.strictEqual(module1Placeholders.placeholder2.name,
					'placeholder2', 'Wrong placeholder name');
				assert.strictEqual(modulesByNames.module1.errorPlaceholder.name,
					'__error', 'Wrong placeholder name');
				assert.strictEqual(module1Placeholders.placeholder1.moduleName,
					'module1', 'Wrong module name');
				assert.strictEqual(module1Placeholders.placeholder2.moduleName,
					'module1', 'Wrong module name');
				assert.strictEqual(
					modulesByNames.module1.errorPlaceholder.moduleName,
					'module1', 'Wrong module name');
				assert.strictEqual(
						module1Placeholders.placeholder1
							.getTemplateStream instanceof Function, true,
					'Placeholder should have getTemplateStream method'
				);
				assert.strictEqual(
						module1Placeholders.placeholder2
							.getTemplateStream instanceof Function, true,
					'Placeholder should have getTemplateStream method'
				);
				assert.strictEqual(
						modulesByNames.module1.errorPlaceholder
							.getTemplateStream instanceof Function, true,
					'Placeholder should have getTemplateStream method'
				);

				// check module 1 placeholders
				var module2Placeholders = modulesByNames.module2.placeholders;
				assert.strictEqual(typeof(module2Placeholders), 'object',
					'Placeholders set should be an object');
				assert.strictEqual(
					module2Placeholders.hasOwnProperty('placeholder1'), true,
					'Should have placeholder1 in set');
				assert.strictEqual(
					module2Placeholders.hasOwnProperty('placeholder2'), true,
					'Should have placeholder2 in set');
				assert.strictEqual(
					modulesByNames.module2.hasOwnProperty('rootPlaceholder'),
					false,
					'module1 should not have root placeholder'
				);
				assert.strictEqual(
					modulesByNames.module2.hasOwnProperty('errorPlaceholder'),
					false, 'module2 should not have error placeholder'
				);

				assert.strictEqual(module2Placeholders.placeholder1.name,
					'placeholder1', 'Wrong placeholder name');
				assert.strictEqual(module2Placeholders.placeholder2.name,
					'placeholder2', 'Wrong placeholder name');
				assert.strictEqual(module2Placeholders.placeholder1.moduleName,
					'module2', 'Wrong module name');
				assert.strictEqual(module2Placeholders.placeholder2.moduleName,
					'module2', 'Wrong module name');
				assert.strictEqual(
						module2Placeholders.placeholder1
							.getTemplateStream instanceof Function, true,
					'Placeholder should have getTemplateStream method'
				);
				assert.strictEqual(
						module2Placeholders.placeholder2
							.getTemplateStream instanceof Function, true,
					'Placeholder should have getTemplateStream method'
				);
			});
	});
});

function checkContexts(modulesByNames) {
	assert.strictEqual(
		typeof(modulesByNames.module1.implementation.$context),
		'object', true,
		'Module should have context');
	assert.strictEqual(
		typeof(modulesByNames.module2.implementation.$context),
		'object', true,
		'Module should have context');
	assert.strictEqual(
		typeof(modulesByNames.module1.implementation.$context.state),
		'object', true,
		'Module should have state');
	assert.strictEqual(
		typeof(modulesByNames.module1
			.implementation.$context.renderedData),
		'object', true,
		'Module should have rendered data cache');
	assert.strictEqual(
		typeof(modulesByNames.module2
			.implementation.$context.renderedData),
		'object', true,
		'Module should have rendered data cache');
	assert.strictEqual(
		typeof(modulesByNames.module2.implementation.$context.state),
		'object', true,
		'Module should have state');
	assert.strictEqual(modulesByNames.module1
		.implementation.$context.cookies instanceof
		CookiesWrapper, true, 'Module should have cookies');
	assert.strictEqual(modulesByNames.module2
		.implementation.$context.cookies instanceof
		CookiesWrapper, true, 'Module should have cookies');
}