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
	ComponentLoader = require('../../../browser/loaders/ComponentLoader'),
	ComponentFinder = require('../../mocks/finders/ComponentFinder'),
	Logger = require('../../mocks/Logger');

describe('browser/loaders/ComponentLoader', function () {
	it('should properly load components', function (done) {
		var locator = createLocator({
			isRelease: true
		});

		locator.registerInstance('component', {
			constructor: function ctr1() {},
			name: 'first-cool',
			properties: {
				name: 'first-cool',
				logic: './logic.js',
				errorTemplate: './templates/error.html',
				template: './templates/template.html'
			},
			templateSource: 'Hello, world!',
			errorTemplateSource: 'Error occurs :('
		});
		locator.registerInstance('component', {
			constructor: function ctr2() {},
			name: 'second',
			properties: {
				logic: './index.js',
				template: './template.html'
			},
			templateSource: 'Hello from second!',
			errorTemplateSource: null
		});

		var components = locator.resolveAll('component').reverse(),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (loadedComponents) {
				assert.strictEqual(
					loadedComponents, loader.getComponentsByNames()
				);
				var componentNames = Object.keys(loadedComponents);
				assert.strictEqual(componentNames.length, 2);

				var component1 = loadedComponents[componentNames[0]],
					component2 = loadedComponents[componentNames[1]];
				assert.strictEqual(
					component1.name, components[0].name
				);
				assert.strictEqual(
					component1.constructor, components[0].constructor
				);

				assert.strictEqual(component2.name, components[1].name);
				assert.strictEqual(
					component2.constructor, components[1].constructor
				);
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

	it('should not load components twice', function (done) {
		var locator = createLocator({
			isRelease: true
		});

		locator.registerInstance('component', {
			constructor: function ctr1() {},
			name: 'first-cool',
			properties: {
				name: 'first-cool',
				logic: './logic.js',
				errorTemplate: './templates/error.html',
				template: './templates/template.html'
			},
			templateSource: 'Hello, world!',
			errorTemplateSource: 'Error occurs :('
		});
		locator.registerInstance('component', {
			constructor: function ctr2() {},
			name: 'second',
			properties: {
				logic: './index.js',
				template: './template.html'
			},
			templateSource: 'Hello from second!',
			errorTemplateSource: null
		});

		var components = locator.resolveAll('component').reverse(),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (loadedComponents) {
				assert.strictEqual(
					loadedComponents, loader.getComponentsByNames()
				);
				var componentNames = Object.keys(loadedComponents);
				assert.strictEqual(componentNames.length, 2);

				var component1 = loadedComponents[componentNames[0]];
				assert.strictEqual(
					component1.name, components[0].name
				);
				locator.unregister('component');
				return loader.load();
			})
			.then(function (loadedComponents) {
				assert.strictEqual(
					loadedComponents, loader.getComponentsByNames()
				);
				var componentNames = Object.keys(loadedComponents);
				assert.strictEqual(componentNames.length, 2);
			})
			.then(done)
			.catch(done);
	});

	it('should properly transform components', function (done) {
		var locator = createLocator({
				isRelease: true
			});

		locator.registerInstance('component', {
			constructor: function ctr1() {},
			name: 'first-cool',
			properties: {
				name: 'first-cool',
				logic: './logic.js',
				errorTemplate: './templates/error.html',
				template: './templates/template.html'
			},
			templateSource: 'Hello, world!',
			errorTemplateSource: 'Error occurs :('
		});
		locator.registerInstance('component', {
			constructor: function ctr2() {},
			name: 'second',
			properties: {
				logic: './index.js',
				template: './template.html'
			},
			templateSource: 'Hello from second!',
			errorTemplateSource: null
		});

		locator.registerInstance('componentTransform', {
			transform: function (component) {
				component.name += '!';
				return Promise.resolve(component);
			}
		});
		locator.registerInstance('componentTransform', {
			transform: function (component) {
				component.name += '?';
				return component;
			}
		});

		var components = locator.resolveAll('component').reverse(),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (loadedComponents) {
				assert.strictEqual(
					loadedComponents, loader.getComponentsByNames()
				);
				var componentNames = Object.keys(loadedComponents);
				assert.strictEqual(componentNames.length, 2);

				var component1 = loadedComponents[componentNames[0]],
					component2 = loadedComponents[componentNames[1]];
				assert.strictEqual(
					component1.name, 'first-cool!?'
				);
				assert.strictEqual(
					component1.constructor,
					components[0].constructor
				);

				assert.strictEqual(component2.name, 'second!?');
				assert.strictEqual(
					component2.constructor,
					components[1].constructor
				);
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

	it('should skip transform errors', function (done) {
		var locator = createLocator({
				isRelease: true
			});

		locator.registerInstance('component', {
			constructor: function ctr1() {},
			name: 'first-cool',
			properties: {
				name: 'first-cool',
				logic: './logic.js',
				errorTemplate: './templates/error.html',
				template: './templates/template.html'
			},
			templateSource: 'Hello, world!',
			errorTemplateSource: 'Error occurs :('
		});
		locator.registerInstance('component', {
			constructor: function ctr2() {},
			name: 'second',
			properties: {
				logic: './index.js',
				template: './template.html'
			},
			templateSource: 'Hello from second!',
			errorTemplateSource: null
		});

		locator.registerInstance('componentTransform', {
			transform: function (component) {
				component.name += '!';
				return Promise.resolve(component);
			}
		});
		locator.registerInstance('componentTransform', {
			transform: function (component) {
				if (component.name === 'second!') {
					throw new Error('test');
				}
				component.name += '?';
				return component;
			}
		});

		var components = locator.resolveAll('component').reverse(),
			loader = locator.resolve('componentLoader');

		loader
			.load()
			.then(function (loadedComponents) {
				assert.strictEqual(
					loadedComponents, loader.getComponentsByNames()
				);
				var componentNames = Object.keys(loadedComponents);
				assert.strictEqual(componentNames.length, 1);

				var component1 = loadedComponents[componentNames[0]];
				assert.strictEqual(
					component1.name, 'first-cool!?'
				);
				assert.strictEqual(
					component1.constructor,
					components[0].constructor
				);
			})
			.then(done)
			.catch(done);
	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	var eventBus = new events.EventEmitter();
	eventBus.on('error', function () {});

	var templateProvider = {
		templates: {},
		render: function (name) {
			return Promise.resolve(templateProvider[name]);
		},
		registerCompiled: function (name, source) {
			templateProvider[name] = source;
		}
	};

	locator.registerInstance('eventBus', eventBus);
	locator.registerInstance('templateProvider', templateProvider);
	locator.register('componentLoader', ComponentLoader);
	locator.register('logger', Logger, config);
	return locator;
}