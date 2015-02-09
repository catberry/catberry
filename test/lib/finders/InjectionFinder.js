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
	fs = require('fs'),
	path = require('path'),
	UglifyJS = require('uglify-js'),
	InjectionFinder = require('../../../lib/finders/InjectionFinder');

var SOURCE_PATH = path.join(
	__dirname, '..', '..', 'cases', 'lib', 'finders',
	'InjectionFinder', 'source.js'
);

describe('lib/finders/InjectionFinder', function () {
	describe('#find', function () {
		it('should find all dependency injections in source', function (done) {
			fs.readFile(SOURCE_PATH, {encoding: 'utf8'},
				function (error, source) {
					if (error) {
						done(error);
						return;
					}

					// check sources
					/*jshint evil:true*/
					eval(source);

					var ast = UglifyJS.parse(source),
						finder = new InjectionFinder(),
						names = finder.find(ast);
					var expected = {
						$inj1: true,
						$inj2: true,
						$inj3: true,
						$inj4: true,
						$inj5: true,
						config1: true,
						config2: true,
						config3: true,
						config4: true,
						config5: true
					};

					assert.deepEqual(
						names.length,
						Object.keys(expected).length,
						'Wrong DI names'
					);

					names.forEach(function (name) {
						assert.strictEqual(name in expected, true);
					});
					done();
				});

		});
	});
});