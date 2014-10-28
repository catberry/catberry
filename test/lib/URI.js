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
	rfcNormal = require('./rfc3986-specs-normal.json'),
	rfcAbnormal = require('./rfc3986-specs-abnormal.json'),
	URI = require('../../lib/URI');

describe('lib/URI', function () {
	describe('constructor', function () {
		it('should properly parse and decode URI string', function () {
			var uriString = 'scheme-%D1%81%D1%85%D0%B5%D0%BC%D0%B0:' +
				'//authority-%D1%85%D0%BE%D1%81%D1%82:10000' +
				'/some/path/to-%D0%BF%D1%83%D1%82%D1%8C/' +
				'?arg-%D0%B0%D1%80%D0%B3%D1%83%D0%BC%D0%B5%D0%BD%D1%82' +
				'=value-%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D0%B5' +
				'#fragment-%D1%84%D1%80%D0%B0%D0%B3%D0%BC%D0%B5%D0%BD%D1%82';

			var uri = new URI(uriString);
			assert.strictEqual(uri.scheme, 'scheme-схема');
			assert.strictEqual(uri.authority, 'authority-хост:10000');
			assert.strictEqual(uri.path, '/some/path/to-путь/');
			assert.strictEqual(uri.query, 'arg-аргумент=value-значение');
			assert.strictEqual(uri.fragment, 'fragment-фрагмент');
		});
		it('should properly parse not-encoded URI string', function () {
			var uriString = 'scheme-схема:' +
				'//authority-хост:10000' +
				'/some/path/to-путь/' +
				'?arg-аргумент=value-значение' +
				'#fragment-фрагмент';

			var uri = new URI(uriString);
			assert.strictEqual(uri.scheme, 'scheme-схема');
			assert.strictEqual(uri.authority, 'authority-хост:10000');
			assert.strictEqual(uri.path, '/some/path/to-путь/');
			assert.strictEqual(uri.query, 'arg-аргумент=value-значение');
			assert.strictEqual(uri.fragment, 'fragment-фрагмент');
		});
	});
	describe('#toString', function () {
		it('should properly recombine and encode URI', function () {
			var uriString = 'scheme-%D1%81%D1%85%D0%B5%D0%BC%D0%B0:' +
				'//authority-%D1%85%D0%BE%D1%81%D1%82:10000' +
				'/some/path/to-%D0%BF%D1%83%D1%82%D1%8C/' +
				'?arg-%D0%B0%D1%80%D0%B3%D1%83%D0%BC%D0%B5%D0%BD%D1%82' +
				'=value-%D0%B7%D0%BD%D0%B0%D1%87%D0%B5%D0%BD%D0%B8%D0%B5' +
				'#fragment-%D1%84%D1%80%D0%B0%D0%B3%D0%BC%D0%B5%D0%BD%D1%82';

			var uri = new URI(uriString);
			assert.strictEqual(uri.toString(), uriString);
		});
	});
	describe('#resolveRelative', function () {
		it('should pass tests from RFC 3986 5.4.1', function () {
			var baseUri = new URI(rfcNormal.baseUri);
			rfcNormal.tests.forEach(function (item) {
				var referenceUri = new URI(item.test),
					resolvedUri = referenceUri.resolveRelative(baseUri);
				assert.strictEqual(resolvedUri.toString(), item.expected);
			});
		});

		it('should pass tests from RFC 3986 5.4.2', function () {
			var baseUri = new URI(rfcAbnormal.baseUri);
			rfcAbnormal.tests.forEach(function (item) {
				var referenceUri = new URI(item.test),
					resolvedUri = referenceUri.resolveRelative(baseUri);
				assert.strictEqual(resolvedUri.toString(), item.expected);
			});
		});
	});
});