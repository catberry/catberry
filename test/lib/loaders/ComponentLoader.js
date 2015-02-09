/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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
	ServiceLocator = require('catberry-locator'),
	ComponentLoader = require('../../../lib/loaders/ComponentLoader'),
	ContextFactory = require('../../../lib/ContextFactory'),
	ModuleApiProvider = require('../../../lib/providers/ModuleApiProvider'),
	CookieWrapper = require('../../../lib/CookieWrapper'),
	ComponentFinder = require('../../mocks/finders/ComponentFinder'),
	Logger = require('../../mocks/Logger');

describe('lib/loaders/ComponentLoader', function () {
	it('should properly load components', function (done) {
		var components = {
				'first-cool': {
					name: 'first-cool',
					path: 'test/cases/lib/loaders/ComponentLoader' +
					'/first/first.json',
					properties: {
						logic: './logic.js',
						errorTemplate: './templates/error.html',
						template: './templates/template.html'
					}
				},
				second: {
					name: 'second',
					path: 'test/cases/lib/loaders/ComponentLoader' +
					'/Second/second.json',
					properties: {
						template: './template.html'
					}
				}
			},
			locator = createLocator({isRelease: true}, components),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (components) {
				assert.strictEqual(components, loader.getComponentsByNames());
				var componentNames = Object.keys(components);
				assert.strictEqual(componentNames.length, 2);

				var component1 = components[componentNames[0]],
					component2 = components[componentNames[1]];
				assert.strictEqual(
					component1.name, components['first-cool'].name
				);
				assert.strictEqual(typeof(component1.constructor), 'function');

				assert.strictEqual(component2.name, components.second.name);
				assert.strictEqual(typeof(component2.constructor), 'function');
				assert.strictEqual(component2.errorTemplate, undefined);

				var expected = [
					'Hello, world!',
					'Error occurs :(',
					'Hello from second!'
				];
				Promise.all([
					component1.template.render(),
					component1.errorTemplate.render(),
					component2.template.render()
				])
					.then(function (rendered) {
						assert.deepEqual(rendered, expected);
						done();
					})
					.catch(done);

			})
			.catch(done);
	});

	it('should not load ' +
	'if component does not export function', function (done) {
		var components = {
				error1: {
					name: 'error1',
					path: 'test/cases/lib/loaders/ComponentLoader' +
					'/Error1/error1.json',
					properties: {
						template: './template.html'
					}
				}
			},
			locator = createLocator({isRelease: true}, components),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (components) {
				assert.strictEqual(components, loader.getComponentsByNames());
				var componentNames = Object.keys(components);
				assert.strictEqual(componentNames.length, 0);
				done();
			})
			.catch(done);
	});

	it('should not load ' +
	'if component does not have "template" field', function (done) {
		var components = {
				error2: {
					name: 'error2',
					path: 'test/cases/lib/loaders/ComponentLoader' +
					'/Error2/error2.json',
					properties: {}
				}
			},
			locator = createLocator({isRelease: true}, components),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (components) {
				assert.strictEqual(components, loader.getComponentsByNames());
				var componentNames = Object.keys(components);
				assert.strictEqual(componentNames.length, 0);
				done();
			})
			.catch(done);
	});

	it('should not load ' +
	'if component has wrong path in "template" field', function (done) {
		var components = {
				error3: {
					name: 'error3',
					path: 'test/cases/lib/loaders/ComponentLoader' +
					'/Error3/error3.json',
					properties: {
						template: './template.html'
					}
				}
			},
			locator = createLocator({isRelease: true}, components),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (components) {
				assert.strictEqual(components, loader.getComponentsByNames());
				var componentNames = Object.keys(components);
				assert.strictEqual(componentNames.length, 0);
				done();
			})
			.catch(done);
	});

	it('should not load ' +
	'if component has no logic file', function (done) {
		var components = {
				error4: {
					name: 'error4',
					path: 'test/cases/lib/loaders/ComponentLoader' +
					'/Error4/error4.json',
					properties: {
						template: './template.html'
					}
				}
			},
			locator = createLocator({isRelease: true}, components),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (components) {
				assert.strictEqual(components, loader.getComponentsByNames());
				var componentNames = Object.keys(components);
				assert.strictEqual(componentNames.length, 0);
				done();
			})
			.catch(done);
	});
});

function createLocator(config, stores) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	var eventBus = new events.EventEmitter();
	eventBus.on('error', function () {});

	var templateProvider = {
		templates: {},
		compile: function (str) {
			return Promise.resolve(str);
		},
		render: function (name) {
			return Promise.resolve(templateProvider[name]);
		},
		registerCompiled: function (name, source) {
			templateProvider[name] = source;
		}
	};

	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('componentFinder', new ComponentFinder(stores));
	locator.registerInstance('templateProvider', templateProvider);
	locator.register('contextFactory', ContextFactory);
	locator.register('moduleApiProvider', ModuleApiProvider);
	locator.register('cookieWrapper', CookieWrapper);
	locator.register('componentLoader', ComponentLoader);
	locator.register('logger', Logger, config);
	return locator;
}