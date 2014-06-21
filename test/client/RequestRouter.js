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
	jsdom = require('jsdom'),
	Logger = require('../mocks/Logger'),
	EventRouter = require('../mocks/EventRouter'),
	FormSubmitter = require('../mocks/FormSubmitter'),
	PageRenderer = require('../mocks/PageRenderer'),
	ServiceLocator = require('catberry-locator'),
	StateProvider = require('../../lib/StateProvider'),
	CookiesWrapper = require('../../lib/CookiesWrapper'),
	RequestRouter = require('../../lib/client/RequestRouter');

describe('client/RequestRouter', function () {
	describe('#route', function () {
		describe('hash handle', function () {
			it('should catch hash on start and request event routing',
				hashHandleCase1
			);

			it('should not catch empty hash on start',
				hashHandleCase2
			);

			it('should always catch hash change and request event routing',
				hashHandleCase3
			);
		});
		describe('link event handle', function () {
			it('should catch link click and raise event if data-event attribute',
				linkEventHandleCase1);
			it('should catch link click in child element and raise event',
				linkEventHandleCase1a);
		});

		describe('link render', function () {
			it('should catch link click and request rendering',
				renderHandleCase1
			);

			it('should properly handle relative URLs with ..',
				renderHandleCase1a
			);

			it('should properly handle relative URLs without ..',
				renderHandleCase1b
			);

			it('should catch link click and pass through if new link changes page',
				renderHandleCase2
			);
		});

		describe('form submit', function () {
			it('should catch submit click and request module data submitting',
				submitHandleCase1);
			it('should not catch submit click if input is not inside form',
				submitHandleCase2);
			it('should not catch submit click if submitter can not handle it',
				submitHandleCase3);
			it('should not catch submit click if button is disabled',
				submitHandleCase4);
		});

	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger);
	locator.register('cookiesWrapper', CookiesWrapper, config);
	locator.register('pageRenderer', PageRenderer, config);
	locator.register('eventRouter', EventRouter, config);
	locator.register('formSubmitter', FormSubmitter, config);
	locator.register('stateProvider', StateProvider, config);
	return locator;
}

function prepareWindow(window, locator) {
	window.location.assign = window.location.replace;
	delete require.cache.jquery;
	var $ = require('jquery')(window);
	locator.registerInstance('window', window);
	locator.registerInstance('jQuery', $);
}

/**
 * Handles first case, when page loads and has hash already.
 * @param {Function} done Mocha done function.
 */
function hashHandleCase1(done) {
	var locator = createLocator(),
		eventRouter = new EventRouter();
	locator.registerInstance('eventRouter', eventRouter);
	eventRouter.once('routeHashChange', function (eventName) {
		assert.strictEqual(eventName, 'test-hash',
			'Wrong event name');
		done();
	});

	jsdom.env({
		html: ' ',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some#test-hash');
				var requestRouter = locator.resolveInstance(RequestRouter);
			});
		}
	});
}

/**
 * Handles second case, when page loads and has not hash.
 * @param {Function} done Mocha done function.
 */
function hashHandleCase2(done) {
	var locator = createLocator(),
		eventRouter = new EventRouter();
	locator.registerInstance('eventRouter', eventRouter);
	eventRouter.once('routeHashChange', function () {
		assert.fail('Should not handle this event');
	});

	jsdom.env({
		html: ' ',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				setTimeout(done, 100);
			});
		}
	});
}

/**
 * Handles third case, when page loaded and hash changing.
 * @param {Function} done Mocha done function.
 */
function hashHandleCase3(done) {
	var locator = createLocator(),
		eventRouter = new EventRouter();
	locator.registerInstance('eventRouter', eventRouter);

	jsdom.env({
		html: ' ',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);

				eventRouter.once('routeHashChange', function (eventName) {
					assert.strictEqual(eventName, 'test1');
					eventRouter.once('routeHashChange', function (eventName) {
						assert.strictEqual(eventName, 'test2');
						eventRouter.once('routeHashChange',
							function (eventName) {
								assert.strictEqual(eventName, '');
								done();
							});

						// at last remove any hash
						window.location.assign('http://local/some');
						$(window).trigger('hashchange');
					});

					// second set to test2
					window.location.assign('http://local/some#test2');
					$(window).trigger('hashchange');
				});

				// first set hash to test1
				window.location.assign('http://local/some#test1');
				$(window).trigger('hashchange');
			});
		}
	});
}

/**
 * Handles first case, when link click causes event in module.
 * @param {Function} done Mocha done function.
 */
function linkEventHandleCase1(done) {
	var locator = createLocator(),
		eventRouter = new EventRouter();
	locator.registerInstance('eventRouter', eventRouter);

	jsdom.env({
		html: '<a id="link" data-event="test1"></a>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);

				eventRouter.once('routeEvent', function (eventName) {
					assert.strictEqual(eventName, 'test1');
					done();
				});

				$('#link').trigger('click');
			});
		}
	});
}

/**
 * Handles first case (sub case a), when link click causes event in module.
 * @param {Function} done Mocha done function.
 */
function linkEventHandleCase1a(done) {
	var locator = createLocator(),
		eventRouter = new EventRouter();
	locator.registerInstance('eventRouter', eventRouter);

	jsdom.env({
		html: '<a data-event="test1">' +
			'<div><span><span id="click-here"></span></span></div>' +
			'</a>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);

				eventRouter.once('routeEvent', function (eventName) {
					assert.strictEqual(eventName, 'test1');
					done();
				});

				$('#click-here').trigger('click');
			});
		}
	});
}

/**
 * Handles first case, when user clicks the link.
 * @param {Function} done Mocha done function.
 */
function renderHandleCase1(done) {
	var locator = createLocator(),
		currentWindow,
		link = '/some' +
			'?global=globalValue' +
			'&first_value=firstValue' +
			'&second_value=secondValue',
		pageRenderer = new PageRenderer();
	locator.registerInstance('pageRenderer', pageRenderer);
	pageRenderer.once('render', function (parameters) {
		assert.strictEqual(typeof(parameters), 'object');
		assert.strictEqual(typeof(parameters.first), 'object');
		assert.strictEqual(typeof(parameters.second), 'object');
		assert.strictEqual(parameters.first.value, 'firstValue');
		assert.strictEqual(parameters.second.value, 'secondValue');
		assert.strictEqual(parameters.first.global, 'globalValue');
		assert.strictEqual(parameters.second.global, 'globalValue');
		assert.strictEqual(currentWindow.location.toString(),
				'http://local' + link);
		assert.strictEqual(currentWindow.history.length, 1);
		done();
	});

	jsdom.env({
		html: '<a href="' + link + '"/>',
		done: function (errors, window) {
			currentWindow = window;
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('a').trigger('click');
			});
		}
	});
}

/**
 * Handles first case, when user clicks relative link.
 * @param {Function} done Mocha done function.
 */
function renderHandleCase1a(done) {
	var locator = createLocator(),
		currentWindow,
		link = '../../some' +
			'?global=globalValue' +
			'&first_value=firstValue' +
			'&second_value=secondValue',
		pageRenderer = new PageRenderer();
	locator.registerInstance('pageRenderer', pageRenderer);
	jsdom.env({
		html: '<a href="' + link + '"/>',
		done: function (errors, window) {
			currentWindow = window;
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local:9090/a/b');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('a').trigger('click');
				assert.strictEqual(currentWindow.location.toString(),
						'http://local:9090/' +
						'some' +
						'?global=globalValue' +
						'&first_value=firstValue' +
						'&second_value=secondValue');
				done();
			});
		}
	});
}

/**
 * Handles first case, when user clicks relative link.
 * @param {Function} done Mocha done function.
 */
function renderHandleCase1b(done) {
	var locator = createLocator(),
		currentWindow,
		link = 'some' +
			'?global=globalValue' +
			'&first_value=firstValue' +
			'&second_value=secondValue',
		pageRenderer = new PageRenderer();
	locator.registerInstance('pageRenderer', pageRenderer);
	jsdom.env({
		html: '<a href="' + link + '"/>',
		done: function (errors, window) {
			currentWindow = window;
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local:9090/a/b');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('a').trigger('click');
				assert.strictEqual(currentWindow.location.toString(),
						'http://local:9090/a/b/' +
						'some' +
						'?global=globalValue' +
						'&first_value=firstValue' +
						'&second_value=secondValue');
				done();
			});
		}
	});
}

/**
 * Handles second case, when user clicks the link which changes whole page.
 * @param {Function} done Mocha done function.
 */
function renderHandleCase2(done) {
	var locator = createLocator(),
		currentWindow,
		link = '/some1' +
			'?global=globalValue' +
			'&first_value=firstValue' +
			'&second_value=secondValue',
		pageRenderer = new PageRenderer();
	locator.registerInstance('pageRenderer', pageRenderer);
	pageRenderer.once('render', function () {
		assert.fail('If link changes page this event should not be triggered');
	});

	jsdom.env({
		html: '<a href="' + link + '"/>',
		done: function (errors, window) {
			currentWindow = window;
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('a').trigger('click');
				setTimeout(function () {
					assert.strictEqual(window.location.toString(),
							'http://local' + link);
					done();
				}, 100);
			});
		}
	});
}

/**
 * Handles first case, when user clicks submit button in form.
 * @param {Function} done Mocha done function.
 */
function submitHandleCase1(done) {
	var form = '<form name="write_some" action="/some/?some_arg=value" ' +
		'data-module="receiver" ' +
		'data-dependents="some_first&receiver_second">' +
		'<input type="text" name="text">' +
		'<input type="submit" value="Submit">' +
		'</form>';

	var locator = createLocator(),
		formSubmitter = new FormSubmitter(true);
	locator.registerInstance('formSubmitter', formSubmitter);

	formSubmitter.once('submit', function (formToSubmit) {
		assert.strictEqual(formToSubmit.length, 1);
		assert.strictEqual(formToSubmit.attr('name'), 'write_some');
		done();
	});

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('#form').html(form);
				$('input[type="submit"]').trigger('click');
			});
		}
	});
}

/**
 * Handles second case, when user clicks submit button not in form.
 * @param {Function} done Mocha done function.
 */
function submitHandleCase2(done) {
	var input = '<input type="submit" value="Submit">',
		locator = createLocator(),
		formSubmitter = new FormSubmitter(true);
	locator.registerInstance('formSubmitter', formSubmitter);

	formSubmitter.once('submit', function () {
		assert.fail('This event should not be triggered ' +
			'because button is not in form');
	});

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('#form').html(input);
				$('input[type="submit"]').trigger('click');
				setTimeout(function () {
					done();
				}, 100);
			});
		}
	});
}

/**
 * Handles third case, when user clicks submit button and submitter
 * can not handle such form.
 * @param {Function} done Mocha done function.
 */
function submitHandleCase3(done) {
	var form = '<form name="write_some" action="/some/?some_arg=value" ' +
		'data-module="receiver" ' +
		'data-dependents="some_first&receiver_second">' +
		'<input type="text" name="text">' +
		'<input type="submit" value="Submit">' +
		'</form>';
	var locator = createLocator(),
		formSubmitter = new FormSubmitter(false);
	locator.registerInstance('formSubmitter', formSubmitter);

	formSubmitter.once('submit', function () {
		assert.fail('This event should not be triggered ' +
			'because submitter can not handle request');
	});

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('#form').html(form);
				$('input[type="submit"]').trigger('click');
				setTimeout(function () {
					done();
				}, 100);
			});
		}
	});
}

/**
 * Handles fourth case, when user clicks disabled submit button
 * @param {Function} done Mocha done function.
 */
function submitHandleCase4(done) {
	var form = '<form name="write_some" action="/some/?some_arg=value" ' +
		'data-module="receiver" ' +
		'data-dependents="some_first&receiver_second">' +
		'<input type="text" name="text">' +
		'<input type="submit" value="Submit" disabled>' +
		'</form>';
	var locator = createLocator(),
		formSubmitter = new FormSubmitter(false);
	locator.registerInstance('formSubmitter', formSubmitter);

	formSubmitter.once('submit', function () {
		assert.fail('This event should not be triggered ' +
			'because submit button is disabled');
	});

	jsdom.env({
		html: '<div id="form"></div>',
		done: function (errors, window) {
			prepareWindow(window, locator);
			var $ = locator.resolve('jQuery');
			$(function () {
				window.location.assign('http://local/some');
				var requestRouter = locator.resolveInstance(RequestRouter);
				$('#form').html(form);
				$('input[type="submit"]').trigger('click');
				setTimeout(function () {
					done();
				}, 100);
			});
		}
	});
}
