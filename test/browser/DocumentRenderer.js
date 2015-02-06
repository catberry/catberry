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
	Component = require('../mocks/components/Component'),
	ComponentAsync = require('../mocks/components/ComponentAsync'),
	ComponentError = require('../mocks/components/ComponentError'),
	ComponentErrorAsync = require('../mocks/components/ComponentErrorAsync'),
	ContextFactory = require('../../lib/ContextFactory'),
	ModuleApiProvider = require('../../lib/providers/ModuleApiProvider'),
	CookieWrapper = require('../../browser/CookieWrapper'),
	ComponentLoader = require('../../browser/loaders/ComponentLoader'),
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
					errorTemplateSource: '<div>Hello, Error!</div>'
				}
			];
			var locator = createLocator(components, {isRelease: true}),
				eventBus = locator.resolve('eventBus');

			var expected = 'Error<br><div>Hello, Error!</div>';

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
					'<noscript>noScript2</noscript>' +
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
							event.target.innerHTML = 'Component1';
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
							event.target.innerHTML = 'Component2';
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
					'Component2' +
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
								event = window.document.createEvent();
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
				'</a></div>';
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
								event = window.document.createEvent();
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
								event = window.document.createEvent();
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
								event = window.document.createEvent();
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
								event = window.document.createEvent();
								event.initEvent('click', true, true);
								links[i].dispatchEvent(event);
							}

							setTimeout(function () {
								assert.strictEqual(element.innerHTML, expected);
								assert.strictEqual(bindCounters.first, 2);
								assert.strictEqual(bindCounters.second, 2);
								assert.strictEqual(unbindCounters.first, 2);
								assert.strictEqual(unbindCounters.second, 3);
								done();
							}, 10);
						})
						.catch(done);
				}
			});
		});

		it('should use the same component instance ' +
		'if it\'s element recreated after rendering', function (done) {
			done();
		});

		it('should use new component instance ' +
		'if it\'s element removed after rendering', function (done) {
			done();
		});
	});
	describe('#render', function () {
		it('should update all components ' +
		'that depend on changed stores', function (done) {
			done();
		});

		it('should do nothing if nothing changes', function (done) {
			done();
		});

		it('should not do rendering concurrently', function (done) {
			done();
		});
	});
	describe('#createComponent', function () {
		it('should properly create and render component', function (done) {
			done();
		});

		it('should reject promise if error', function (done) {
			done();
		});
	});
});

function createLocator(components, config) {
	var locator = new ServiceLocator();
	components.forEach(function (component) {
		locator.registerInstance('component', component);
	});

	locator.register('componentLoader', ComponentLoader, config);
	locator.register('contextFactory', ContextFactory, config);
	locator.register('moduleApiProvider', ModuleApiProvider, config);
	locator.register('cookieWrapper', CookieWrapper, config);
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.registerInstance('storeDispatcher', {
		setState: function () {
			return [];
		}
	});

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