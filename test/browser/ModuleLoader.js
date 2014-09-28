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
	Logger = require('../mocks/Logger'),
	moduleHelper = require('../../lib/helpers/moduleHelper'),
	ServiceLocator = require('catberry-locator'),
	UniversalMock = require('../mocks/UniversalMock'),
	StateProvider = require('../../lib/StateProvider'),
	ContextFactory = require('../../lib/ContextFactory'),
	ModuleApiProvider = require('../../browser/ModuleApiProvider'),
	CookiesWrapper = require('../../browser/CookiesWrapper'),
	ModuleLoader = require('../../browser/ModuleLoader');

global.Promise = require('promise');

function Module1() {}
function Module2() {}
function Module3() {
	this.$context = null;
}

var modules = [
	{
		name: 'module1',
		implementation: Module1
	},
	{
		name: 'module2',
		implementation: Module2
	},
	{
		name: 'module3',
		implementation: Module3
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

describe('browser/ModuleLoader', function () {
	describe('#getModulesByNames', function () {
		it('should load all modules and placeholders from Service Locator',
			/*jshint maxstatements:false */
			function () {
				var locator = new ServiceLocator();
				locator.registerInstance('serviceLocator', locator);
				locator.registerInstance('eventBus', new events.EventEmitter());
				locator.registerInstance('config', {});
				locator.registerInstance('window', {
					location: '',
					document: {
						cookies: ''
					},
					navigator: {
						userAgent: 'test agent'
					}
				});
				var templateProvider = new UniversalMock([
					'registerCompiled', 'render'
				]);
				locator.registerInstance('templateProvider', templateProvider);
				locator.register('cookiesWrapper', CookiesWrapper);
				locator.register('moduleApiProvider', ModuleApiProvider);
				locator.register('stateProvider', StateProvider);
				locator.register('contextFactory', ContextFactory);
				locator.register('logger', Logger);

				modules.forEach(function (module) {
					locator.registerInstance('module', module);
				});

				placeholders.forEach(function (placeholder) {
					locator.registerInstance('placeholder', placeholder);
				});

				var moduleLoader = locator.resolveInstance(ModuleLoader),
					modulesByNames = moduleLoader.getModulesByNames();

				assert.strictEqual(
					Object.keys(modulesByNames).length, modules.length,
					'Should be 2 modules'
				);

				modules
					.map(function (module) {
						return module.name;
					})
					.forEach(function (moduleName) {
						assert.strictEqual(
							modulesByNames.hasOwnProperty(moduleName), true,
								'Should have ' + moduleName + ' in set'
						);
						assert.strictEqual(
							modulesByNames[moduleName].name, moduleName,
							'Wrong module name'
						);

						// check module placeholders
						placeholders
							.filter(function (placeholder) {
								return placeholder.moduleName === moduleName;
							})
							.forEach(function (placeholder) {
								var inModule;

								if (moduleHelper
									.isRootPlaceholder(placeholder.name)) {
									assert.strictEqual(
										modulesByNames[moduleName]
											.rootPlaceholder, undefined
									);
									return;
								}
								if (placeholder.name === '__error') {
									inModule = modulesByNames[moduleName]
										.errorPlaceholder;
								} else {
									inModule = modulesByNames[moduleName]
										.placeholders[placeholder.name];
								}

								assert.strictEqual(
									typeof(inModule), 'object',
									'Placeholder not found'
								);
								assert.strictEqual(
									inModule.name, placeholder.name
								);
								assert.strictEqual(
									inModule.source, placeholder.source
								);
								assert.strictEqual(
									inModule.moduleName, moduleName
								);
								var fullName = moduleHelper
									.joinModuleNameAndContext(
									moduleName, placeholder.name
								);
								assert.strictEqual(inModule.fullName, fullName);

								assert.strictEqual(
										inModule.render instanceof Function,
									true,
									'Placeholder should have render method'
								);
								var rendered = false,
									dc = {};
								templateProvider.once('render',
									function (args) {
										assert.strictEqual(args[0], fullName);
										assert.strictEqual(args[1], dc);
										rendered = true;
									});
								inModule.render(dc);
								assert.strictEqual(rendered, true);
							});
					});

				assert.strictEqual(
						modulesByNames.module1.implementation instanceof
						Module1, true,
					'Wrong module implementation');
				assert.strictEqual(
						modulesByNames.module2.implementation instanceof
						Module2, true,
					'Wrong module implementation');
				assert.strictEqual(
						modulesByNames.module3.implementation instanceof
						Module3, true,
					'Wrong module implementation');

				// check contexts
				checkContexts(modulesByNames);
			});
	});
});

function checkContexts(modulesByNames) {
	Object.keys(modulesByNames)
		.forEach(function (moduleName) {
			assert.strictEqual(
				typeof(modulesByNames[moduleName].implementation.$context),
				'object', true,
				'Module should have context');
			assert.strictEqual(
				typeof(modulesByNames[moduleName].implementation.$context.state),
				'object', true,
				'Module should have state');
			assert.strictEqual(
				typeof(modulesByNames[moduleName]
					.implementation.$context.renderedData),
				'object', true,
				'Module should have rendered data cache');
			assert.strictEqual(modulesByNames[moduleName]
				.implementation.$context.cookies instanceof
				CookiesWrapper, true, 'Module should have cookies');
		});
}