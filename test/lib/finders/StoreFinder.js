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
	path = require('path'),
	fs = require('fs'),
	events = require('events'),
	ServiceLocator = require('catberry-locator'),
	Logger = require('../../mocks/Logger'),
	FileWatcher = require('../../../lib/FileWatcher'),
	StoreFinder = require('../../../lib/finders/StoreFinder');

var CASE_PATH = path.join(
	'test', 'cases', 'lib', 'finders', 'StoreFinder'
);

describe('lib/finders/StoreFinder', function () {
	describe('#find', function () {
		it('should find all valid stores', function (done) {
			var locator = createLocator({
					storesDirectory: path.join(CASE_PATH, 'catberry_stores')
				}),
				finder = locator.resolve('storeFinder');

			var expectedPath = path.join(
					process.cwd(), CASE_PATH, 'expected.json'
				),
				expected = require(expectedPath);

			finder
				.find()
				.then(function (found) {
					assert.strictEqual(
						Object.keys(found).length,
						Object.keys(expected).length,
						'Wrong store count'
					);

					Object.keys(expected)
						.forEach(function (name) {
							assert.strictEqual(
								(name in found), true,
								name + ' not found'
							);
							assert.strictEqual(
								found[name].name, expected[name].name
							);
							assert.strictEqual(
								found[name].path, expected[name].path
							);
						});
					done();
				})
				.catch(done);
		});

		it('should watch stores for changes', function (done) {
			var locator = createLocator({
					storesDirectory: path.join(CASE_PATH, 'catberry_stores')
				}),
				finder = locator.resolve('storeFinder');

			finder
				.find()
				.then(function (found) {
					finder.watch(function () {
						done();
					});
					var key = Object.keys(found)[0],
						componentPath = path.join(
							process.cwd(),
							found[key].path
						);
					fs.readFile(componentPath,
						function (error, data) {
							if (error) {
								done(error);
							}
							fs.writeFile(componentPath, data);
						});
				})
				.catch(done);
		});
	});
});

function createLocator(config) {
	var locator = new ServiceLocator();
	locator.registerInstance('serviceLocator', locator);
	locator.registerInstance('config', config);
	locator.registerInstance('eventBus', new events.EventEmitter());
	locator.register('storeFinder', StoreFinder, config);
	locator.register('fileWatcher', FileWatcher, config);
	locator.register('logger', Logger, config);
	return locator;
}