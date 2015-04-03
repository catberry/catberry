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
	jsdom = require('jsdom'),
	StoreDispatcher = require('../../lib/StoreDispatcher'),
	Component = require('../mocks/components/Component'),
	DataStore = require('../mocks/stores/DataStore'),
	ComponentAsync = require('../mocks/components/ComponentAsync'),
	ComponentError = require('../mocks/components/ComponentError'),
	ComponentErrorAsync = require('../mocks/components/ComponentErrorAsync'),
	ContextFactory = require('../../lib/ContextFactory'),
	ModuleApiProvider = require('../../lib/providers/ModuleApiProvider'),
	CookieWrapper = require('../../browser/CookieWrapper'),
	ComponentLoader = require('../../browser/loaders/ComponentLoader'),
	StoreLoader = require('../../browser/loaders/StoreLoader'),
	DocumentRenderer = require('../../browser/DocumentRenderer'),
	ServiceLocator = require('catberry-locator');

describe('browser/DocumentRenderer', function () {
	describe('#renderComponent', function () {
		it('should render component into HTML element', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test<br><div>Hello, World!</div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, expected);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render asynchronous component ' +
		'into HTML element', function (done) {
			var components = [
				{
					name: 'test-async',
					constructor: ComponentAsync,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test-async<br><div>Hello, World!</div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document
							.createElement('cat-test-async');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, expected);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render debug output ' +
		'instead the content when error in debug mode', function (done) {
			var components = [
				{
					name: 'test',
					constructor: ComponentError,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var check = /Error: test/;

			eventBus.on('error', function (error) {
				assert.strictEqual(error.message, 'test');
			});
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(
								check.test(element.innerHTML), true
							);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render debug output ' +
		'instead the content when error in debug mode ' +
		'and async component', function (done) {
			var components = [
				{
					name: 'test-async',
					constructor: ComponentErrorAsync,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var check = /Error: test-async/;

			eventBus.on('error', function (error) {
				assert.strictEqual(error.message, 'test-async');
			});
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement(
							'cat-test-async'
						);
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(
								check.test(element.innerHTML), true
							);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render empty string ' +
		'instead the content when error in release mode', function (done) {
			var components = [
				{
					name: 'test-async',
					constructor: ComponentErrorAsync,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {isRelease: true}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', function (error) {
				assert.strictEqual(error.message, 'test-async');
			});
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement(
							'cat-test-async'
						);
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, '');
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render error template ' +
		'instead the content when error in release mode', function (done) {
			var components = [
				{
					name: 'test-async',
					constructor: ComponentErrorAsync,
					templateSource: '<div>Hello, World!</div>',
					errorTemplateSource: '<div>Hello, Error!</div>' +
						'<cat-error id="cat-error" test="error-text">' +
						'</cat-error>'
				},
				{
					name: 'error',
					constructor: ComponentAsync,
					templateSource: '<div>Hello, Error Component!</div>' +
					'<cat-error2 id="cat-error2"></cat-error2>'
				},
				{
					name: 'error2',
					constructor: ComponentErrorAsync,
					templateSource: 'none'
				}
			];
			var locator = createLocator(components, {isRelease: true}),
				eventBus = locator.resolve('eventBus');

			var expected = 'Error<br><div>Hello, Error!</div>' +
				'<cat-error id="cat-error" test="error-text">' +
				'error<br>' +
				'<div>Hello, Error Component!</div>' +
				'<cat-error2 id="cat-error2"></cat-error2>' +
				'</cat-error>';

			eventBus.on('error', function (error) {
				// nothing to do
			});
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement(
							'cat-test-async'
						);
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, expected);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should do nothing if there is no such component', function (done) {
			var components = [];
			var locator = createLocator(components, {isRelease: true}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement(
							'cat-test-async'
						);
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, '');
							done();
						})
						.catch(done);
				}
			});
		});

		it('should do nothing if component is HEAD', function (done) {
			var head = '<title>First title</title>' +
					'<base href="someLink1" target="_parent">' +
					'<noscript>noScript1</noscript>' +
					'<style type="text/css">' +
					'some styles1' +
					'</style>' +
					'<style type="text/css">' +
					'some styles2' +
					'</style>' +
					'<script type="application/javascript">' +
					'some scripts1' +
					'</script>' +
					'<script type="application/javascript">' +
					'some scripts2' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc1">' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc2">' +
					'</script>' +
					'<link rel="stylesheet" href="someStyleLink1">' +
					'<link rel="stylesheet" href="someStyleLink2">' +
					'<meta name="name1" content="value1">' +
					'<meta name="name2" content="value2">' +
					'<meta name="name3" content="value3">',
				components = [{
					name: 'head',
					templateSource: '<title>Second title</title>',
					constructor: ComponentError
				}],
				locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', function (error) {
				assert.strictEqual(error.message, 'head');
			});
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					window.document.head.innerHTML = head;
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.renderComponent(window.document.head)
						.then(function () {
							assert.strictEqual(
								window.document.head.innerHTML, head
							);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should do nothing if there is no Element\'s ID', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, '');
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render nested components', function (done) {
			var components = [
				{
					name: 'test1',
					constructor: ComponentAsync,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: ComponentAsync,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: ComponentAsync,
					templateSource: 'Hello from test3'

				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br>' +
				'<div>Hello from test1</div>' +
				'<cat-test2 id="unique2">' +
					'test2<br>' +
					'<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3">' +
						'test3<br>' +
						'Hello from test3' +
					'</cat-test3>' +
					'</span>' +
				'</cat-test2>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, expected);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should render nested components with cycles', function (done) {
			var components = [
				{
					name: 'test1',
					constructor: ComponentAsync,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: ComponentAsync,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: ComponentAsync,
					templateSource: '<cat-test1 id="unique1"/>'

				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br>' +
				'<div>Hello from test1</div>' +
				'<cat-test2 id="unique2">' +
					'test2<br>' +
					'<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3">' +
					'test3<br>' +
					'<cat-test1 id="unique1"></cat-test1>' +
					'</cat-test3>' +
					'</span>' +
				'</cat-test2>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							assert.strictEqual(element.innerHTML, expected);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should merge HEAD component ' +
		'with new rendered HTML', function (done) {
			var head = '<title>First title</title>' +
					'<base href="someLink1" target="_parent">' +
					'<style type="text/css">' +
					'some styles1' +
					'</style>' +
					'<style type="text/css">' +
					'some styles2' +
					'</style>' +
					'<script type="application/javascript">' +
					'some scripts1' +
					'</script>' +
					'<script type="application/javascript">' +
					'some scripts2' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc1">' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc2">' +
					'</script>' +
					'<link rel="stylesheet" href="someStyleLink1">' +
					'<link rel="stylesheet" href="someStyleLink2">' +
					'<meta name="name1" content="value1">' +
					'<meta name="name2" content="value2">' +
					'<meta name="name3" content="value3">',
				expected = '<title>Second title</title>' +
					'<base href="someLink2" target="_parent">' +
					'<style type="text/css">' +
					'some styles1' +
					'</style>' +
					'<style type="text/css">' +
					'some styles2' +
					'</style>' +
					'<script type="application/javascript">' +
					'some scripts1' +
					'</script>' +
					'<script type="application/javascript">' +
					'some scripts2' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc1">' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc2">' +
					'</script>' +
					'<link rel="stylesheet" href="someStyleLink1">' +
					'<link rel="stylesheet" href="someStyleLink2">' +
					'<meta name="name1" content="value1">' +
					'head<br><noscript>noScript2</noscript>' +
					'<style type="text/css">' +
					'some styles3' +
					'</style>' +
					'<script type="application/javascript">' +
					'some scripts3' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc3">' +
					'</script>' +
					'<link rel="stylesheet" href="someStyleLink3">' +
					'<meta name="name4" content="value4">',
				components = [{
					name: 'head',
					templateSource: '<title>Second title</title>' +
					'<base href="someLink2" target="_parent">' +
					'<noscript>noScript2</noscript>' +
					'<style type="text/css">' +
					'some styles1' +
					'</style>' +
					'<script type="application/javascript">' +
					'some scripts1' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc1">' +
					'</script>' +
					'<link rel="stylesheet" href="someStyleLink1">' +
					'<meta name="name1" content="value1">' +
					'<style type="text/css">' +
					'some styles3' +
					'</style>' +
					'<script type="application/javascript">' +
					'some scripts3' +
					'</script>' +
					'<script type="application/javascript" ' +
					'src="someScriptSrc3">' +
					'</script>' +
					'<link rel="stylesheet" href="someStyleLink3">' +
					'<meta name="name4" content="value4">',
					constructor: Component
				}],
				locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					window.document.head.innerHTML = head;
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.renderComponent(window.document.head)
						.then(function () {
							assert.strictEqual(
								window.document.head.innerHTML, expected
							);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should bind all events from bind method', function (done) {
			function Component1() {}
			Component1.prototype.render = function () {
				return this.$context;
			};
			Component1.prototype.bind = function () {
				return {
					click: {
						'a.clickable': function (event) {
							event.target.innerHTML += 'Component1';
						}
					}
				};
			};

			function Component2() {}
			Component2.prototype.render = function () {
				return this.$context;
			};
			Component2.prototype.bind = function () {
				return {
					click: {
						'a.clickable': function (event) {
							event.currentTarget.innerHTML = 'Component2';
						}
					}
				};
			};

			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div><a class="clickable"></a></div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span><a class="clickable"></a></span>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br><div><a class="clickable">' +
				'Component1' +
				'</a></div>' +
				'<cat-test2 id="unique2">' +
					'test2<br>' +
					'<span><a class="clickable">' +
					'Component2Component1' +
					'</a></span>' +
				'</cat-test2>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							var event,
								links = element.querySelectorAll('a.clickable');
							for(var i = 0; i < links.length; i++) {
								event = window.document
									.createEvent('MouseEvents');
								event.initEvent('click', true, true);
								links[i].dispatchEvent(event);
							}

							setTimeout(function () {
								assert.strictEqual(element.innerHTML, expected);
								done();
							}, 10);
						})
						.catch(done);
				}
			});
		});

		it('should handle dispatched events', function (done) {
			function Component1() {}
			Component1.prototype.render = function () {
				return this.$context;
			};
			Component1.prototype.bind = function () {
				return {
					click: {
						'a.clickable': function (event) {
							event.target.parentNode.innerHTML += 'Component1';
							event.currentTarget
								.parentNode.innerHTML += 'Component1';
						}
					}
				};
			};

			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div><a class="clickable">' +
					'<span><div class="toclick"></div></span>' +
					'</a></div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br><div><a class="clickable">' +
				'<span><div class="toclick"></div>Component1</span>' +
				'</a>Component1</div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							var event,
								toClick = element.querySelectorAll('div.toclick');
							for(var i = 0; i < toClick.length; i++) {
								event = window.document
									.createEvent('MouseEvents');
								event.initEvent('click', true, true);
								toClick[i].dispatchEvent(event);
							}

							setTimeout(function () {
								assert.strictEqual(element.innerHTML, expected);
								done();
							}, 10);
						})
						.catch(done);
				}
			});
		});

		it('should do nothing if event selector ' +
		'does not match', function (done) {
			function Component1() {}
			Component1.prototype.render = function () {
				return this.$context;
			};
			Component1.prototype.bind = function () {
				return {
					click: {
						'a.non-clickable': function (event) {
							event.target.innerHTML = 'Component1';
						}
					}
				};
			};

			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div><a class="clickable"></a></div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br><div><a class="clickable"></a></div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							var event,
								links = element.querySelectorAll('a.clickable');
							for(var i = 0; i < links.length; i++) {
								event = window.document
									.createEvent('MouseEvents');
								event.initEvent('click', true, true);
								links[i].dispatchEvent(event);
							}

							setTimeout(function () {
								assert.strictEqual(element.innerHTML, expected);
								done();
							}, 10);
						})
						.catch(done);
				}
			});
		});

		it('should do nothing if event handler ' +
		'is not a function', function (done) {
			function Component1() {}
			Component1.prototype.render = function () {
				return this.$context;
			};
			Component1.prototype.bind = function () {
				return {
					click: {
						'a.clickable': 'wrong'
					}
				};
			};

			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div><a class="clickable"></a></div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br><div><a class="clickable"></a></div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							var event,
								links = element.querySelectorAll('a.clickable');
							for(var i = 0; i < links.length; i++) {
								event = window.document
									.createEvent('MouseEvents');
								event.initEvent('click', true, true);
								links[i].dispatchEvent(event);
							}

							setTimeout(function () {
								assert.strictEqual(element.innerHTML, expected);
								done();
							}, 10);
						})
						.catch(done);
				}
			});
		});

		it('should unbind all events and call unbind', function (done) {
			var bindCounters = {
				first: 0,
				second: 0
			};
			var unbindCounters = {
				first: 0,
				second: 0
			};
			function Component1() {}
			Component1.prototype.render = function () {
				return this.$context;
			};
			Component1.prototype.bind = function () {
				bindCounters.first++;
				if (bindCounters.first > 1) {
					return;
				}
				return {
					click: {
						'a.clickable': function (event) {
							event.target.innerHTML = 'Component1';
						}
					}
				};
			};
			Component1.prototype.unbind = function () {
				unbindCounters.first++;
			};

			function Component2() {}
			Component2.prototype.render = function () {
				return this.$context;
			};
			Component2.prototype.bind = function () {
				bindCounters.second++;
				if (bindCounters.second > 1) {
					return;
				}
				return {
					click: {
						'a.clickable': function (event) {
							event.target.innerHTML = 'Component2';
						}
					}
				};
			};
			Component2.prototype.unbind = function () {
				unbindCounters.second++;
			};

			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div><a class="clickable"></a></div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span><a class="clickable"></a></span>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test1<br><div><a class="clickable">' +
				'</a></div>' +
				'<cat-test2 id="unique2">' +
				'test2<br>' +
				'<span><a class="clickable">' +
				'</a></span>' +
				'</cat-test2>';

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							return renderer.renderComponent(element);
						})
						.then(function () {
							var event,
								links = element.querySelectorAll('a.clickable');
							for(var i = 0; i < links.length; i++) {
								event = window.document
									.createEvent('MouseEvents');
								event.initEvent('click', true, true);
								links[i].dispatchEvent(event);
							}

							setTimeout(function () {
								assert.strictEqual(element.innerHTML, expected);
								assert.strictEqual(bindCounters.first, 2);
								assert.strictEqual(bindCounters.second, 2);
								assert.strictEqual(unbindCounters.first, 2);
								assert.strictEqual(unbindCounters.second, 2);
								done();
							}, 10);
						})
						.catch(done);
				}
			});
		});

		it('should use the same component instance ' +
		'if it\'s element recreated after rendering', function (done) {
			var instances = {
				first: [],
				second: [],
				third: []
			};
			function Component1() {
				instances.first.push(this);
			}
			Component1.prototype.render = function () {
				return this.$context;
			};
			function Component2() {
				instances.second.push(this);
			}
			Component2.prototype.render = function () {
				return this.$context;
			};
			function Component3() {
				instances.third.push(this);
			}
			Component3.prototype.render = function () {
				return this.$context;
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'

				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					renderer.renderComponent(element)
						.then(function () {
							return renderer.renderComponent(element);
						})
						.then(function () {
							return renderer.renderComponent(element);
						})
						.then(function () {
							assert.strictEqual(instances.first.length, 1);
							assert.strictEqual(instances.second.length, 1);
							assert.strictEqual(instances.third.length, 1);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should use new component instance ' +
		'if it\'s element removed after rendering', function (done) {
			var instances = {
				first: [],
				second: [],
				third: []
			};
			var templates = {},
				counter = 0,
				templateProvider = {
					registerCompiled: function (name, source) {
						templates[name] = source;
					},
					render: function (name, data) {
						if (counter % 2 === 0) {
							return Promise.resolve('');
						}

						return Promise.resolve(templates[name]);
					}
				};
			function Component1() {
				instances.first.push(this);
			}
			Component1.prototype.render = function () {
				return this.$context;
			};
			function Component2() {
				instances.second.push(this);
			}
			Component2.prototype.render = function () {
				return this.$context;
			};
			function Component3() {
				instances.third.push(this);
			}
			Component3.prototype.render = function () {
				return this.$context;
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'

				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					locator.registerInstance(
						'templateProvider', templateProvider
					);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test1');
					element.setAttribute('id', 'unique1');
					counter++;
					renderer.renderComponent(element)
						.then(function () {
							counter++;
							return renderer.renderComponent(element);
						})
						.then(function () {
							counter++;
							return renderer.renderComponent(element);
						})
						.then(function () {
							assert.strictEqual(instances.first.length, 1);
							assert.strictEqual(instances.second.length, 2);
							assert.strictEqual(instances.third.length, 2);
							done();
						})
						.catch(done);
				}
			});
		});
	});

	describe('#render', function () {
		it('should update all components ' +
		'that depend on changed stores in descending order', function (done) {
			var renders = [];
			function Component1() {}
			Component1.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component2() {}
			Component2.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component3() {}
			Component3.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'
				}
			];

			var stores = [
				{name: 'store1', constructor: DataStore},
				{name: 'store2', constructor: DataStore},
				{name: 'store3', constructor: DataStore}
			];
			var html = '<cat-test1 id="unique1" cat-store="store2">' +
					'test1<br>' +
					'<div>Hello from test1</div>' +
					'<cat-test2 id="unique2">' +
						'test2<br>' +
						'<span>' +
						'Hello from test2' +
							'<cat-test3 id="unique3" cat-store="store1">' +
							'test3<br>' +
							'Hello from test3' +
							'</cat-test3>' +
						'</span>' +
					'</cat-test2>' +
				'</cat-test1>' +
				'<cat-test3 id="unique4" cat-store="store1">' +
					'test3<br>' +
					'Hello from test3' +
				'</cat-test3>';

			var locator = createLocator(components, {}, stores),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: html,
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);

					renderer.render({}, {})
						.then(function () {
							return renderer.render(
								{store1: {}, store2: {}, store3: {}}, {}
							);
						})
						.then(function () {
							assert.strictEqual(renders.length, 4);
							assert.strictEqual(renders[0], 'unique1');
							assert.strictEqual(renders[1], 'unique4');
							assert.strictEqual(renders[2], 'unique2');
							assert.strictEqual(renders[3], 'unique3');
							done();
						})
						.catch(done);
				}
			});
		});

		it('should update all components ' +
		'that depend on changed store by .changed() method', function (done) {
			var renders = [];
			function Component1() {
				var self = this;
				setTimeout(function () {
					self.$context.sendAction('test');
				}, 10);
			}
			Component1.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component2() {}
			Component2.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component3() {}
			Component3.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function TimerStore() {}
			TimerStore.prototype.handleTest = function () {
				var self = this;
				setTimeout(function () {
					self.$context.changed();
				}, 10);
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'
				}
			];

			var stores = [
				{name: 'store1', constructor: DataStore},
				{name: 'store2', constructor: TimerStore},
				{name: 'store3', constructor: DataStore}
			];
			var html = '<cat-test1 id="unique1" cat-store="store2">' +
					'test1<br>' +
					'<div>Hello from test1</div>' +
					'<cat-test2 id="unique2">' +
						'test2<br>' +
						'<span>' +
						'Hello from test2' +
						'<cat-test3 id="unique3" cat-store="store1">' +
							'test3<br>' +
							'Hello from test3' +
						'</cat-test3>' +
						'</span>' +
					'</cat-test2>' +
					'</cat-test1>' +
				'<cat-test3 id="unique4" cat-store="store2">' +
				'test3<br>' +
				'Hello from test3' +
				'</cat-test3>';

			var locator = createLocator(components, {}, stores),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: html,
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.render({}, {})
						.then(function () {
							eventBus.on('documentUpdated', function () {
								try {
									assert.strictEqual(renders.length, 4);
									assert.strictEqual(renders[0], 'unique1');
									assert.strictEqual(renders[1], 'unique4');
									assert.strictEqual(renders[2], 'unique2');
									assert.strictEqual(renders[3], 'unique3');
									done();
								} catch(e) {
									done(e);
								}
							});
						});
				}
			});
		});

		it('should update all components ' +
		'that depend on changed stores by .changed() method', function (done) {
			var renders = [];
			function Component1() {
				var self = this;
				setTimeout(function () {
					self.$context.sendBroadcastAction('test', 10);
				}, 10);
			}
			Component1.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component2() {}
			Component2.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component3() {}
			Component3.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function TimerStore() {}
			TimerStore.prototype.handleTest = function (delay) {
				var self = this;
				setTimeout(function () {
					self.$context.changed();
				}, delay);
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'
				}
			];

			var stores = [
				{name: 'store1', constructor: TimerStore},
				{name: 'store2', constructor: TimerStore},
				{name: 'store3', constructor: TimerStore}
			];
			var html = '<cat-test1 id="unique1" cat-store="store2">' +
					'test1<br>' +
					'<div>Hello from test1</div>' +
					'<cat-test2 id="unique2">' +
						'test2<br>' +
						'<span>' +
						'Hello from test2' +
						'<cat-test3 id="unique3" cat-store="store1">' +
							'test3<br>' +
							'Hello from test3' +
						'</cat-test3>' +
						'</span>' +
					'</cat-test2>' +
					'</cat-test1>' +
					'<cat-test3 id="unique4" cat-store="store3">' +
					'test3<br>' +
					'Hello from test3' +
				'</cat-test3>';

			var locator = createLocator(components, {}, stores),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: html,
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.render({}, {});
					setTimeout(function () {
						assert.strictEqual(renders.length, 4);
						assert.strictEqual(renders[0], 'unique4');
						assert.strictEqual(renders[1], 'unique1');
						assert.strictEqual(renders[2], 'unique2');
						assert.strictEqual(renders[3], 'unique3');
						done();
					}, 1000);
				}
			});
		});

		it('should do nothing if nothing changes', function (done) {
			var renders = [];
			function Component1() {}
			Component1.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component2() {}
			Component2.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			function Component3() {}
			Component3.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				return this.$context;
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'
				}
			];

			var stores = [
				{name: 'store1', constructor: DataStore},
				{name: 'store2', constructor: DataStore},
				{name: 'store3', constructor: DataStore}
			];
			var html = '<cat-test1 id="unique1" cat-store="store2">' +
				'test1<br>' +
				'<div>Hello from test1</div>' +
				'<cat-test2 id="unique2">' +
				'test2<br>' +
				'<span>' +
				'Hello from test2' +
				'<cat-test3 id="unique3" cat-store="store1">' +
				'test3<br>' +
				'Hello from test3' +
				'</cat-test3>' +
				'</span>' +
				'</cat-test2>' +
				'</cat-test1>' +
				'<cat-test3 id="unique4" cat-store="store1">' +
				'test3<br>' +
				'Hello from test3' +
				'</cat-test3>';

			var state = {store1: {}, store2: {}, store3: {}},
				locator = createLocator(components, {}, stores),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: html,
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);

					renderer.render(state, {})
						.then(function () {
							return renderer.render(state, {});
						})
						.then(function () {
							assert.strictEqual(renders.length, 0);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should not do rendering concurrently', function (done) {
			var renders = [];
			function Component1() {}
			Component1.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				var self = this;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill(self.$context);
					}, 10);
				});
			};
			function Component2() {}
			Component2.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				var self = this;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill(self.$context);
					}, 10);
				});
			};
			function Component3() {}
			Component3.prototype.render = function () {
				renders.push(this.$context.attributes.id);
				var self = this;
				return new Promise(function (fulfill) {
					setTimeout(function () {
						fulfill(self.$context);
					}, 10);
				});
			};
			var components = [
				{
					name: 'test1',
					constructor: Component1,
					templateSource: '<div>Hello from test1</div>' +
					'<cat-test2 id="unique2"/>'
				},
				{
					name: 'test2',
					constructor: Component2,
					templateSource: '<span>' +
					'Hello from test2' +
					'<cat-test3 id="unique3"/>' +
					'</span>'
				},
				{
					name: 'test3',
					constructor: Component3,
					templateSource: 'Hello from test3'
				}
			];

			var stores = [
				{name: 'store1', constructor: DataStore},
				{name: 'store2', constructor: DataStore},
				{name: 'store3', constructor: DataStore}
			];
			var html = '<cat-test1 id="unique1" cat-store="store2">' +
					'test1<br>' +
					'<div>Hello from test1</div>' +
					'<cat-test2 id="unique2" cat-store="store3">' +
						'test2<br>' +
						'<span>' +
						'Hello from test2' +
						'<cat-test3 id="unique3" cat-store="store1">' +
							'test3<br>' +
							'Hello from test3' +
						'</cat-test3>' +
						'</span>' +
					'</cat-test2>' +
					'</cat-test1>' +
				'<cat-test3 id="unique4" cat-store="store1">' +
				'test3<br>' +
				'Hello from test3' +
				'</cat-test3>';

			var locator = createLocator(components, {}, stores),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: html,
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);

					renderer.render({}, {})
						.then(function () {
							renderer.render({store1: {}}, {});
							renderer.render({store1: {}, store2: {}}, {});
							return renderer.render(
								{store1: {}, store2: {}, store3: {}}, {}
							);
						})
						.then(function () {
							assert.strictEqual(renders.length, 5);
							assert.strictEqual(renders[0], 'unique3');
							assert.strictEqual(renders[1], 'unique4');
							assert.strictEqual(renders[2], 'unique1');
							assert.strictEqual(renders[3], 'unique2');
							assert.strictEqual(renders[4], 'unique3');
							done();
						})
						.catch(done);
				}
			});
		});
	});

	describe('#createComponent', function () {
		it('should properly create and render component', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test<br><div>Hello, World!</div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.createComponent('cat-test', {id: 'unique'})
						.then(function (element) {
							assert.strictEqual(element.innerHTML, expected);
							done();
						})
						.catch(done);
				}
			});
		});

		it('should reject promise if wrong component', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.createComponent('cat-wrong', {id: 'unique'})
						.then(function () {
							done(new Error('Should fail'));
						})
						.catch(function (reason) {
							assert.strictEqual(
								reason.message,
								'Component for tag "cat-wrong" not found'
							);
							done();
						});
				}
			});
		});

		it('should reject promise if ID is not specefied', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.createComponent('cat-test', {})
						.then(function () {
							done(new Error('Should fail'));
						})
						.catch(function (reason) {
							assert.strictEqual(
								reason.message,
								'The ID is not specified or already used'
							);
							done();
						});
				}
			});
		});

		it('should reject promise if ID is already used', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.createComponent('cat-test', {id: 'some'})
						.then(function () {
							return renderer.createComponent(
								'cat-test', {id: 'some'}
							);
						})
						.then(function () {
							done(new Error('Should fail'));
						})
						.catch(function (reason) {
							assert.strictEqual(
								reason.message,
								'The ID is not specified or already used'
							);
							done();
						});
				}
			});
		});

		it('should reject promise if tag name ' +
		'is not a string', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.createComponent(500, {id: 'some'})
						.then(function () {
							done(new Error('Should fail'));
						})
						.catch(function (reason) {
							assert.strictEqual(
								reason.message,
								'Tag name should be a string ' +
								'and attributes should be an object'
							);
							done();
						});
				}
			});
		});

		it('should reject promise if attributes set ' +
		'is not an object', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer);
					renderer.createComponent('cat-test', 100)
						.then(function () {
							done(new Error('Should fail'));
						})
						.catch(function (reason) {
							assert.strictEqual(
								reason.message,
								'Tag name should be a string ' +
								'and attributes should be an object'
							);
							done();
						});
				}
			});
		});
	});

	describe('#collectGarbage', function () {
		it('should unlink component if it is not in DOM', function (done) {
			var components = [
				{
					name: 'test',
					constructor: Component,
					templateSource: '<div>Hello, World!</div>'
				}
			];
			var locator = createLocator(components, {}),
				eventBus = locator.resolve('eventBus');

			var expected = 'test<br><div>Hello, World!</div>';
			eventBus.on('error', done);
			jsdom.env({
				html: ' ',
				done: function (errors, window) {
					locator.registerInstance('window', window);
					var renderer = locator.resolveInstance(DocumentRenderer),
						element = window.document.createElement('cat-test');
					element.setAttribute('id', 'unique');
					renderer.renderComponent(element)
						.then(function () {
							var instance = renderer.getComponentById('unique');
							assert.strictEqual(
								instance instanceof Component, true
							);
							return renderer.collectGarbage();
						})
						.then(function () {
							var instance = renderer.getComponentById('unique');
							assert.strictEqual(instance, null);
							done();
						})
						.catch(done);
				}
			});
		});
	});
});

function createLocator(components, config, stores) {
	var locator = new ServiceLocator();
	components.forEach(function (component) {
		locator.registerInstance('component', component);
	});

	if (stores) {
		stores.forEach(function (store) {
			locator.registerInstance('store', store);
		});
	}

	locator.register('componentLoader', ComponentLoader, config, true);
	locator.register('storeLoader', StoreLoader, config, true);
	locator.register('contextFactory', ContextFactory, config, true);
	locator.register('moduleApiProvider', ModuleApiProvider, config);
	locator.register('cookieWrapper', CookieWrapper, config);
	locator.register('storeDispatcher', StoreDispatcher);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	locator.registerInstance('eventBus', new events.EventEmitter());

	var templates = {};
	locator.registerInstance('templateProvider', {
		registerCompiled: function (name, compiled) {
			templates[name] = compiled;
		},
		render: function (name, context) {
			return Promise.resolve(
				context.name + '<br>' + templates[name]
			);
		}
	});
	return locator;
}