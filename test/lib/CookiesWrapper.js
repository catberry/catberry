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
	CookiesWrapper = require('../../lib/CookiesWrapper');

describe('lib/CookiesWrapper', function () {
	describe('#get', function () {
		it('should return empty string if cookie string is null', function () {
			var cookiesWrapper = new CookiesWrapper();
			cookiesWrapper.initWithString(null);
			assert.strictEqual(cookiesWrapper.get('some'), '');
		});
		it('should return empty string if cookie key is not a string',
			function () {
				var cookiesWrapper = new CookiesWrapper();
				cookiesWrapper.initWithString('some=value;');
				assert.strictEqual(cookiesWrapper.get({}), '');
			});
		it('should return value if cookie string is right', function () {
			var cookiesWrapper = new CookiesWrapper();
			cookiesWrapper.initWithString('some=value; some2=value2');
			assert.strictEqual(cookiesWrapper.get('some'), 'value');
			assert.strictEqual(cookiesWrapper.get('some2'), 'value2');
		});
		it('should return empty string if cookie string is wrong', function () {
			var cookiesWrapper = new CookiesWrapper();
			cookiesWrapper.initWithString('fasdfa/gafg-sgafga');
			assert.strictEqual(cookiesWrapper.get('fasdfa/gafg-sgafga'), '');
		});
	});
	describe('#set', function () {
		it('should set cookie by specified parameters',
			function () {
				var cookiesWrapper = new CookiesWrapper(),
					expiration = new Date(),
					expected = 'some=value' +
						'; max-age=100' +
						'; expire=' +
						expiration.toUTCString() +
						'; path=/some' +
						'; domain=.new.domain' +
						'; secure; HttpOnly';

				cookiesWrapper.initWithString(null);

				cookiesWrapper.set({
					key: 'some',
					value: 'value',
					maxAge: 100,
					expire: expiration,
					domain: '.new.domain',
					path: '/some',
					secure: true,
					httpOnly: true
				});

				assert.strictEqual(cookiesWrapper.setCookies.length, 1);
				assert.strictEqual(cookiesWrapper.setCookies[0], expected);
			});
		it('should set several cookies by specified parameters',
			function () {
				var cookiesWrapper = new CookiesWrapper(),
					expected1 = 'some=value',
					expected2 = 'some2=value2';

				cookiesWrapper.initWithString(null);

				cookiesWrapper.set({
					key: 'some',
					value: 'value'
				});
				cookiesWrapper.set({
					key: 'some2',
					value: 'value2'
				});

				assert.strictEqual(cookiesWrapper.setCookies.length, 2);
				assert.strictEqual(cookiesWrapper.setCookies[0], expected1);
				assert.strictEqual(cookiesWrapper.setCookies[1], expected2);
			});
		it('should set default expire date by max age',
			function () {
				var cookiesWrapper = new CookiesWrapper(),
					expiration = new Date(Date.now() + 3600000),
					expected = 'some=value' +
						'; max-age=3600' +
						'; expire=' +
						expiration.toUTCString();

				cookiesWrapper.set({
					key: 'some',
					value: 'value',
					maxAge: 3600
				});

				assert.strictEqual(cookiesWrapper.setCookies.length, 1);
				assert.strictEqual(cookiesWrapper.setCookies[0], expected);
			});
		it('should throw error if wrong key',
			function () {
				var cookiesWrapper = new CookiesWrapper();

				assert.throws(function () {
					cookiesWrapper.set({
						key: {}
					});
				}, Error);
			});
		it('should throw error if wrong value',
			function () {
				var cookiesWrapper = new CookiesWrapper();

				assert.throws(function () {
					cookiesWrapper.set({
						key: 'some',
						value: {}
					});
				}, Error);
			});
	});
});