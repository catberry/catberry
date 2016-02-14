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
	URI = require('catberry-uri').URI,
	Logger = require('../mocks/Logger'),
	ServerResponse = require('../mocks/ServerResponse'),
	Component = require('../mocks/components/Component'),
	ComponentError = require('../mocks/components/ComponentError'),
	ComponentAsync = require('../mocks/components/ComponentAsync'),
	ComponentErrorAsync = require('../mocks/components/ComponentErrorAsync'),
	DataStore = require('../mocks/stores/DataStore'),
	DataAsyncStore = require('../mocks/stores/DataAsyncStore'),
	ErrorStore = require('../mocks/stores/ErrorStore'),
	ErrorAsyncStore = require('../mocks/stores/ErrorAsyncStore'),
	ModuleApiProvider = require('../../lib/providers/ModuleApiProvider'),
	CookieWrapper = require('../../lib/CookieWrapper'),
	ServiceLocator = require('catberry-locator'),
	ContextFactory = require('../../lib/ContextFactory'),
	StoreDispatcher = require('../../lib/StoreDispatcher'),
	DocumentRenderer = require('../../lib/DocumentRenderer');

describe('lib/DocumentRenderer', function() {
	describe('#render', function() {
		it('should render nothing if no such component', function(done) {
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head><title>Hello</title></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-comp id="1"></cat-comp>' +
								'<cat-async-comp id="2"/>' +
								'</body>' +
								'</html>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>Hello</title></head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"1\"></cat-comp>' +
					'<cat-async-comp id=\"2\"/>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should ignore second head and document tags', function(done) {
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<head></head>' +
								'<document></document>' +
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
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'document – document' +
					'<head></head>' +
					'<document></document>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render components without stores', function(done) {
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
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
						render: function(context) {
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
						render: function(context) {
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
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
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

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render components with stores', function(done) {
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
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<!DOCTYPE html>' +
										'<html>' +
										'<head cat-store="folder/store2">' +
										'</head>' +
										'<body>' +
										'document – ' + context.name + ' - ' +
										(storeData ? storeData.name : '') +
										'<cat-comp id="1" cat-store="store1">' +
										'</cat-comp>' +
										'<cat-async-comp id="2" ' +
										'cat-store="folder/store2">' +
										'</cat-async-comp>' +
										'</body>' +
										'</html>';
								});
						}
					}
				},
				head: {
					name: 'head',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<title>' +
										'head – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</title>';
								});
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: Component,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'content – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'test – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, stores, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head cat-store="folder/store2">' +
					'<title>head – head – folder/store2</title>' +
					'</head>' +
					'<body>document – document - ' +
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

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should render errors with wrong stores', function(done) {
			var errorTemplate = {
				render: function(context) {
					return Promise.resolve('Error: ' + context.message);
				}
			};
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<!DOCTYPE html>' +
									'<html>' +
									'<head cat-store="folder/store2"></head>' +
									'<body>' +
									'document – ' + context.name + ' - ' +
									(storeData ? storeData.name : '') +
									'<cat-comp id="1" cat-store="store1">' +
									'</cat-comp>' +
									'<cat-async-comp id="2" ' +
									'cat-store="folder/store2">' +
									'</cat-async-comp>' +
									'</body>' +
									'</html>';
								});
						}
					}
				},
				head: {
					name: 'head',
					constructor: ComponentAsync,
					errorTemplate: errorTemplate,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<title>' +
										'head – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</title>';
								});
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: Component,
					errorTemplate: errorTemplate,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'content – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'test – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				}
			};
			var routingContext = createRoutingContext({
					isRelease: true
				}, {}, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head cat-store="folder/store2">' +
					'Error: Store "folder/store2" not found' +
					'</head>' +
					'<body>document – document - ' +
					'<cat-comp id=\"1\" cat-store=\"store1\">' +
					'Error: Store "store1" not found' +
					'</cat-comp>' +
					'<cat-async-comp id=\"2\" cat-store=\"folder/store2\">' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render nested components', function(done) {
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
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<!DOCTYPE html>' +
										'<html>' +
										'<head cat-store="folder/store2"></head>' +
										'<body>' +
										'document – ' + context.name + ' - ' +
										(storeData ? storeData.name : '') +
										'<cat-comp id="1" cat-store="store1">' +
										'</cat-comp>' +
										'</body>' +
										'</html>';
								});
						}
					}
				},
				head: {
					name: 'head',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<title>' +
									'head – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
									'</title>';
								});
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: Component,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'content – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'<cat-async-comp id="2" ' +
										'cat-store="folder/store2">' +
										'</cat-async-comp>' +
										'</div>';
								});
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'test – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, stores, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head cat-store="folder/store2">' +
					'<title>head – head – folder/store2</title>' +
					'</head>' +
					'<body>document – document - ' +
					'<cat-comp id=\"1\" cat-store=\"store1\">' +
					'<div>' +
					'content – comp – store1' +
					'<cat-async-comp id=\"2\" cat-store=\"folder/store2\">' +
					'<div>test – async-comp – folder/store2</div>' +
					'</cat-async-comp>' +
					'</div>' +
					'</cat-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render errors in components', function(done) {
			var errorTemplate = {
					render: function(context) {
						return Promise.resolve('Error: ' + context.message);
					}
				},
				components = {
					document: {
						name: 'document',
						constructor: ComponentAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
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
						constructor: ComponentErrorAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<title>' +
									'head – ' + context.name +
									'</title>';
								return Promise.resolve(template);
							}
						}
					},
					comp: {
						name: 'comp',
						constructor: ComponentError,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<div>' +
									'content – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
					},
					'async-comp': {
						name: 'async-comp',
						constructor: ComponentErrorAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<div>' +
									'test – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
					}
				};
			var routingContext = createRoutingContext({
					isRelease: true
				}, {}, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head>Error: head</head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"1\">Error: comp</cat-comp>' +
					'<cat-async-comp id=\"2\">' +
					'Error: async-comp' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render errors in component constructor', function(done) {
			function ErrorConstructor() {
				throw new Error('test');
			}
			var errorTemplate = {
					render: function(context) {
						return Promise.resolve('Error: ' + context.message);
					}
				},
				components = {
					document: {
						name: 'document',
						constructor: ComponentAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<!DOCTYPE html>' +
									'<html>' +
									'<head></head>' +
									'<body>' +
									'document – ' + context.name +
									'<cat-comp id="1"></cat-comp>' +
									'</body>' +
									'</html>';
								return Promise.resolve(template);
							}
						}
					},
					head: {
						name: 'head',
						constructor: ComponentErrorAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<title>' +
									'head – ' + context.name +
									'</title>';
								return Promise.resolve(template);
							}
						}
					},
					comp: {
						name: 'comp',
						constructor: ErrorConstructor,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<div>' +
									'content – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
					}
				};
			var routingContext = createRoutingContext({
					isRelease: true
				}, {}, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head>Error: head</head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"1\">Error: test</cat-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render errors in stores', function(done) {
			var errorTemplate = {
				render: function(context) {
					return Promise.resolve('Error: ' + context.message);
				}
			};
			var stores = {
				store1: {
					name: 'store1',
					constructor: ErrorStore
				},
				'folder/store2': {
					name: 'folder/store2',
					constructor: ErrorAsyncStore
				}
			};
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					errorTemplate: errorTemplate,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<!DOCTYPE html>' +
										'<html>' +
										'<head cat-store="folder/store2">' +
										'</head>' +
										'<body>' +
										'document – ' + context.name + ' - ' +
										(storeData ? storeData.name : '') +
										'<cat-comp id="1" cat-store="store1">' +
										'</cat-comp>' +
										'<cat-async-comp id="2" ' +
										'cat-store="folder/store2">' +
										'</cat-async-comp>' +
										'</body>' +
										'</html>';
								});
						}
					}
				},
				head: {
					name: 'head',
					constructor: ComponentAsync,
					errorTemplate: errorTemplate,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<title>' +
										'head – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</title>';
								});
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: Component,
					errorTemplate: errorTemplate,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'content – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					errorTemplate: errorTemplate,
					template: {
						render: function(context) {
							return context.getStoreData()
								.then(function(storeData) {
									return '<div>' +
										'test – ' + context.name + ' – ' +
										(storeData ? storeData.name : '') +
										'</div>';
								});
						}
					}
				}
			};
			var routingContext = createRoutingContext({
					isRelease: true
				}, stores, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head cat-store="folder/store2">' +
					'Error: folder/store2' +
					'</head>' +
					'<body>document – document - ' +
					'<cat-comp id=\"1\" cat-store=\"store1\">' +
					'Error: store1' +
					'</cat-comp>' +
					'<cat-async-comp id=\"2\" cat-store=\"folder/store2\">' +
					'Error: folder/store2' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render nothing ' +
		'if error in error template', function(done) {
			var errorTemplate = {
					render: function() {
						throw new Error('template');
					}
				},
				components = {
					document: {
						name: 'document',
						constructor: ComponentAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
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
						constructor: ComponentErrorAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<title>' +
									'head – ' + context.name +
									'</title>';
								return Promise.resolve(template);
							}
						}
					},
					comp: {
						name: 'comp',
						constructor: ComponentError,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<div>' +
									'content – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
					},
					'async-comp': {
						name: 'async-comp',
						constructor: ComponentErrorAsync,
						errorTemplate: errorTemplate,
						template: {
							render: function(context) {
								var template = '<div>' +
									'test – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
					}
				};
			var routingContext = createRoutingContext({
					isRelease: true
				}, {}, components),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head></head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"1\"></cat-comp>' +
					'<cat-async-comp id=\"2\">' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>',
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result,
						expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should properly render debug info', function(done) {
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
							render: function(context) {
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
					constructor: ComponentErrorAsync,
					template: {
							render: function(context) {
								var template = '<title>' +
									'head – ' + context.name +
									'</title>';
								return Promise.resolve(template);
							}
						}
				},
				comp: {
					name: 'comp',
					constructor: ComponentError,
					template: {
							render: function(context) {
								var template = '<div>' +
									'content – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentErrorAsync,
					template: {
							render: function(context) {
								var template = '<div>' +
									'test – ' + context.name +
									'</div>';
								return Promise.resolve(template);
							}
						}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			routingContext.middleware.response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						routingContext.middleware.response.result.length > 0,
						true, 'Wrong HTML'
					);
					done();
				});
		});

		it('should set code 200 and required headers', function(done) {
			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
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
						render: function(context) {
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
						render: function(context) {
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
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
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

			documentRenderer.render({}, routingContext);
			var response = routingContext.middleware.response;
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, expected, 'Wrong HTML'
					);
					assert.strictEqual(response.status, 200);
					assert.strictEqual(
						Object.keys(response.setHeaders).length, 2
					);
					assert.strictEqual(
						typeof (response.setHeaders['Content-Type']), 'string'
					);
					assert.strictEqual(
						typeof (response.setHeaders['X-Powered-By']), 'string'
					);
					done();
				});
		});

		it('should set code 302 and Location if redirect in HEAD', function(done) {
			function Head() {}
			Head.prototype.render = function() {
				this.$context.redirect('/to/garden');
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-async-comp id="2"></cat-async-comp>' +
								'</body>' +
								'</html>';
							return Promise.resolve(template);
						}
					}
				},
				head: {
					name: 'head',
					constructor: Head,
					template: {
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, '', 'Should be empty content'
					);
					assert.strictEqual(response.status, 302);
					assert.strictEqual(
						Object.keys(response.setHeaders).length, 1
					);
					assert.strictEqual(
						response.setHeaders.Location, '/to/garden'
					);
					done();
				});
		});

		it('should set header if set cookie in HEAD', function(done) {
			function Head() {}
			Head.prototype.render = function() {
				this.$context.cookie.set({
					key: 'first',
					value: 'value1'
				});
				this.$context.cookie.set({
					key: 'second',
					value: 'value2'
				});
				return this.$context;
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-async-comp id="2"></cat-async-comp>' +
								'</body>' +
								'</html>';
							return Promise.resolve(template);
						}
					}
				},
				head: {
					name: 'head',
					constructor: Head,
					template: {
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer'),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'document – document' +
					'<cat-async-comp id=\"2\">' +
					'<div>test – async-comp</div>' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, expected, 'Wrong HTML'
					);
					assert.strictEqual(response.status, 200);
					assert.strictEqual(
						Object.keys(response.setHeaders).length, 3
					);
					assert.strictEqual(
						typeof (response.setHeaders['Content-Type']), 'string'
					);
					assert.strictEqual(
						typeof (response.setHeaders['X-Powered-By']), 'string'
					);
					assert.deepEqual(
						response.setHeaders['Set-Cookie'], [
							'first=value1',
							'second=value2'
						]
					);
					done();
				});
		});

		it('should pass to the next middleware if notFound()', function(done) {
			function Head() {}
			Head.prototype.render = function() {
				this.$context.notFound();
				return this.$context;
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-async-comp id="2"></cat-async-comp>' +
								'</body>' +
								'</html>';
							return Promise.resolve(template);
						}
					}
				},
				head: {
					name: 'head',
					constructor: Head,
					template: {
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer');

			routingContext.middleware.next = function() {
				done();
			};
			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.fail('Should not finish the response');
				});
		});

		it('should render inline script if clearFragment() in HEAD', function(done) {
			function Head() {}
			Head.prototype.render = function() {
				this.$context.clearFragment();
				return this.$context;
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-async-comp id="2"></cat-async-comp>' +
								'</body>' +
								'</html>';
							return Promise.resolve(template);
						}
					}
				},
				head: {
					name: 'head',
					constructor: Head,
					template: {
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				'async-comp': {
					name: 'async-comp',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer'),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'<script>window.location.hash = \'\';</script>' +
					'document – document' +
					'<cat-async-comp id=\"2\">' +
					'<div>test – async-comp</div>' +
					'</cat-async-comp>' +
					'</body>' +
					'</html>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should render inline script if clearFragment()', function(done) {
			function ClearFragmentComponent() {}
			ClearFragmentComponent.prototype.render = function() {
				this.$context.clearFragment();
				return this.$context;
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-comp id="2"></cat-comp>' +
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
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: ClearFragmentComponent,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer'),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"2\">' +
					'<script>window.location.hash = \'\';</script>' +
					'<div>test – comp</div>' +
					'</cat-comp>' +
					'</body>' +
					'</html>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should render inline script if redirect()', function(done) {
			function RedirectComponent() {}
			RedirectComponent.prototype.render = function() {
				this.$context.redirect('/to/garden');
				return this.$context;
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-comp id="2"></cat-comp>' +
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
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: RedirectComponent,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer'),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"2\">' +
					'<script>window.location.assign(\'/to/garden\');</script>' +
					'<div>test – comp</div>' +
					'</cat-comp>' +
					'</body>' +
					'</html>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, expected, 'Wrong HTML'
					);
					done();
				});
		});

		it('should render inline script if cookie.set()', function(done) {
			function CookieComponent() {}
			CookieComponent.prototype.render = function() {
				this.$context.cookie.set({
					key: 'key',
					value: 'value'
				});
				return this.$context;
			};

			var components = {
				document: {
					name: 'document',
					constructor: ComponentAsync,
					template: {
						render: function(context) {
							var template = '<!DOCTYPE html>' +
								'<html>' +
								'<head></head>' +
								'<body>' +
								'document – ' + context.name +
								'<cat-comp id="2"></cat-comp>' +
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
						render: function(context) {
							var template = '<title>' +
								'head – ' + context.name +
								'</title>';
							return Promise.resolve(template);
						}
					}
				},
				comp: {
					name: 'comp',
					constructor: CookieComponent,
					template: {
						render: function(context) {
							var template = '<div>' +
								'test – ' + context.name +
								'</div>';
							return Promise.resolve(template);
						}
					}
				}
			};
			var routingContext = createRoutingContext({}, {}, components),
				response = routingContext.middleware.response,
				documentRenderer = routingContext.locator
					.resolve('documentRenderer'),
				expected = '<!DOCTYPE html>' +
					'<html>' +
					'<head><title>head – head</title></head>' +
					'<body>' +
					'document – document' +
					'<cat-comp id=\"2\">' +
					'<script>window.document.cookie = \'key=value\';</script>' +
					'<div>test – comp</div>' +
					'</cat-comp>' +
					'</body>' +
					'</html>';

			documentRenderer.render({}, routingContext);
			response
				.on('error', done)
				.on('finish', function() {
					assert.strictEqual(
						response.result, expected, 'Wrong HTML'
					);
					done();
				});
		});
	});
});

function createRoutingContext(config, stores, components) {
	var locator = new ServiceLocator();
	locator.register('cookieWrapper', CookieWrapper, config);
	locator.register('logger', Logger, config);
	locator.register('contextFactory', ContextFactory, config, true);
	locator.register('documentRenderer', DocumentRenderer, config, true);
	locator.register('moduleApiProvider', ModuleApiProvider, config, true);
	locator.register('storeDispatcher', StoreDispatcher);
	locator.registerInstance('componentLoader', {
		load: function() {
			return Promise.resolve();
		},
		getComponentsByNames: function() {
			return components;
		}
	});
	locator.registerInstance('storeLoader', {
		load: function() {
			return Promise.resolve();
		},
		getStoresByNames: function() {
			return stores;
		}
	});
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	var eventBus = new events.EventEmitter();
	eventBus.on('error', function() {});
	locator.registerInstance('eventBus', eventBus);

	var contextFactory = locator.resolve('contextFactory');
	return contextFactory.create({
		referrer: new URI(),
		location: new URI(),
		userAgent: 'test',
		middleware: {
			response: new ServerResponse(),
			next: function() {}
		}
	});
}
