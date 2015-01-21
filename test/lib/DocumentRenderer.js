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
	stream = require('stream'),
	util = require('util'),
	URI = require('catberry-uri').URI,
	Component = require('../mocks/components/Component'),
	ComponentError = require('../mocks/components/ComponentError'),
	ComponentAsync = require('../mocks/components/ComponentAsync'),
	ComponentErrorAsync = require('../mocks/components/ComponentErrorAsync'),
	DataStore = require('../mocks/stores/DataStore'),
	DataAsyncStore = require('../mocks/stores/DataAsyncStore'),
	ErrorStore = require('../mocks/stores/ErrorStore'),
	ErrorAsyncStore = require('../mocks/stores/ErrorAsyncStore'),
	ContentStream = require('../../lib/streams/ContentReadable'),
	ModuleApiProvider = require('../../lib/providers/ModuleApiProvider'),
	CookieWrapper = require('../../lib/CookieWrapper'),
	ServiceLocator = require('catberry-locator'),
	ContextFactory = require('../../lib/ContextFactory'),
	StoreDispatcher = require('../../lib/StoreDispatcher'),
	DocumentRenderer = require('../../lib/DocumentRenderer');

describe('lib/DocumentRenderer', function () {
	describe('#render', function () {
		it('should render properly components without stores', function (done) {
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function (context) {
							var template = '<!DOCTYPE html>' +
							'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-comp id="1"></cat-comp>' +
								'<cat-async-comp id="2"></cat-async-comp>' +
								'</body>' +
							'</html>';
							return Promise.resolve(template);
						}
					}
				},
				head: {
					name: 'head',
					constructor: ComponentAsync,
					template: {
						render: function (context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: Component,
					template: {
						render: function (context) {
							var template = '<div>' +
								'content – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function (context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				outputStream = new stream.PassThrough(),
				output = '',
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"1\"><div>content – comp</div></cat-comp>' +
					'<cat-async-comp id=\"2\">' +
					'<div>test – async-comp</div>' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			// stub for HTTP response method
			outputStream.writeHead = function () {};

			documentRenderer.render(routingContext, {}, outputStream);
			outputStream
				.on('data', function (chunk) {
					output += chunk;
				})
				.on('error', done)
				.on('end', function () {
					assert.strictEqual(output, expected, 'Wrong HTML');
					done();
				});
		});

		it('should render properly components with stores', function (done) {
			var stores = {
				store1: {
					name: 'store1',
					constructor: DataStore
				},
				'folder/store2': {
					name: 'folder/store2',
					constructor: DataAsyncStore
				}
			};
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function (context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name + ' - ' +
								context.storeData.name +
								'<cat-comp id="1" cat-store="store1">' +
								'</cat-comp>' +
								'<cat-async-comp id="2" ' +
								'cat-store="folder/store2">' +
								'</cat-async-comp>' +
								'</body>' +
								'</html>';
							return Promise.resolve(template);
						}
					}
				},
				head: {
					name: 'head',
					constructor: ComponentAsync,
					template: {
						render: function (context) {
							var template = '<title>' +
								'head – ' + context.name + ' – ' +
								context.storeData.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: Component,
					template: {
						render: function (context) {
							var template = '<div>' +
								'content – ' + context.name + ' – ' +
								context.storeData.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function (context) {
							var template = '<div>' +
								'test – ' + context.name + ' – ' +
								context.storeData.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, stores, components),
				outputStream = new stream.PassThrough(),
				output = '',
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head – undefined</title></head>' +
					'<body>document – document - undefined' +
					'<cat-comp id=\"1\" cat-store=\"store1\">' +
					'<div>content – comp – store1</div>' +
					'</cat-comp>' +
					'<cat-async-comp id=\"2\" cat-store=\"folder/store2\">' +
					'<div>test – async-comp – folder/store2</div>' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			// stub for HTTP response method
			outputStream.writeHead = function () {};

			documentRenderer.render(routingContext, {}, outputStream);
			outputStream
				.on('data', function (chunk) {
					output += chunk;
				})
				.on('error', done)
				.on('end', function () {
					assert.strictEqual(output, expected, 'Wrong HTML');
					done();
				});
		});
	});
});

function createRoutingContext(config, stores, components) {
	var locator = new ServiceLocator();
	locator.register('cookieWrapper', CookieWrapper, config);
	locator.register('contextFactory', ContextFactory, config, true);
	locator.register('documentRenderer', DocumentRenderer, config, true);
	locator.register('moduleApiProvider', ModuleApiProvider, config, true);
	locator.register('storeDispatcher', StoreDispatcher);
	locator.registerInstance('componentLoader', {
		load: function () {
			return Promise.resolve();
		},
		getComponentsByNames: function () {
			return components;
		}
	});
	locator.registerInstance('storeLoader', {
		load: function () {
			return Promise.resolve();
		},
		getStoresByNames: function () {
			return stores;
		}
	});
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	locator.registerInstance('eventBus', new events.EventEmitter());

	var contextFactory = locator.resolve('contextFactory');
	return contextFactory.create({
		referrer: new URI(),
		location: new URI(),
		userAgent: 'test'
	});
}