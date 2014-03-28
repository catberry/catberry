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
	ServiceLocator = require('../../lib/ServiceLocator'),
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

		describe('link render', function () {
			it('should catch link click and request rendering',
				renderHandleCase1
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
		});

	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.register('logger', Logger);
	locator.register('pageRenderer', PageRenderer, config);
	locator.register('eventRouter', EventRouter, config);
	locator.register('formSubmitter', FormSubmitter, config);
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
	eventRouter.once('route', function (eventName) {
		assert.deepEqual(eventName, 'test-hash',
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
	eventRouter.once('route', function () {
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

				eventRouter.once('route', function (eventName) {
					assert.deepEqual(eventName, 'test1');
					eventRouter.once('route', function (eventName) {
						assert.deepEqual(eventName, 'test2');
						eventRouter.once('route', function (eventName) {
							assert.deepEqual(eventName, null);
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
		assert.deepEqual(typeof(parameters), 'object');
		assert.deepEqual(typeof(parameters.first), 'object');
		assert.deepEqual(typeof(parameters.second), 'object');
		assert.deepEqual(parameters.first.value, 'firstValue');
		assert.deepEqual(parameters.second.value, 'secondValue');
		assert.deepEqual(parameters.first.$global.global, 'globalValue');
		assert.deepEqual(parameters.second.$global.global, 'globalValue');
		assert.deepEqual(currentWindow.location.toString(),
				'http://local' + link);
		assert.deepEqual(currentWindow.history.length, 1);
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
					assert.deepEqual(window.location.toString(),
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
		assert.deepEqual(formToSubmit.length, 1);
		assert.deepEqual(formToSubmit.attr('name'), 'write_some');
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
