'use strict';

const assert = require('assert');
const CookieWrapper = require('../../lib/CookieWrapper');
const cases = require('../cases/lib/CookieWrapper.json');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/CookieWrapper', function() {
	var cookieWrapper;

	beforeEach(function() {
		cookieWrapper = new CookieWrapper();
	});

	describe('#get', function() {
		cases.get.forEach(testCase => {
			it(testCase.name, function() {
				cookieWrapper.initWithString(testCase.cookieString);
				testCase.checkCookies.forEach(check => {
					assert.strictEqual(cookieWrapper.get(check.key), check.value);
				});
			});
		});
	});

	describe('#set', function() {
		cases.set.forEach(testCase => {
			it(testCase.name, function() {
				cookieWrapper.initWithString(null);
				testCase.cookies.forEach(cookie => {
					if (cookie.expires) {
						cookie.expires = new Date(cookie.expires);
					}
					cookieWrapper.set(cookie);
				});
				assert.deepEqual(cookieWrapper.setCookie, testCase.expectedStrings);
			});
		});

		it('should set default expire date by max age', function() {
			const expiration = new Date(Date.now() + 3600000);
			const expected = `some=value; Max-Age=3600; Expires=${expiration.toUTCString()}`;

			cookieWrapper.set({
				key: 'some',
				value: 'value',
				maxAge: 3600
			});

			assert.strictEqual(cookieWrapper.setCookie.length, 1);
			assert.strictEqual(cookieWrapper.setCookie[0], expected);
		});

		it('should throw error if wrong key', function() {
			assert.throws(() => cookieWrapper.set({
				key: {}
			}));
		});

		it('should throw error if wrong value', function() {
			assert.throws(() => cookieWrapper.set({
				key: 'some',
				value: {}
			}));
		});
	});

	describe('#getCookieString', function() {
		it('should return right cookie string with init', function() {
			const cookieString = 'some=value; some2=value2';
			cookieWrapper.initWithString(cookieString);
			assert.strictEqual(cookieWrapper.getCookieString(), cookieString);
		});

		it('should return right cookie string without init but with set', function() {
			const expected = 'some3=value3; some4=value4';
			cookieWrapper.set({
				key: 'some3',
				value: 'value3'
			});
			cookieWrapper.set({
				key: 'some4',
				value: 'value4'
			});
			assert.strictEqual(cookieWrapper.getCookieString(), expected);
		});

		it('should return right cookie string after init and set', function() {
			var cookieWrapper = new CookieWrapper();
			cookieWrapper.initWithString('some=value; some2=value2');
			cookieWrapper.set({
				key: 'some3',
				value: 'value3'
			});
			cookieWrapper.set({
				key: 'some4',
				value: 'value4'
			});
			assert.strictEqual(
				cookieWrapper.getCookieString(),
				'some=value; some2=value2; some3=value3; some4=value4'
			);
		});
	});
	describe('#getAll', function() {
		it('should return right cookie string', function() {
			cookieWrapper.initWithString('some=value; some2=value2');
			assert.deepEqual(cookieWrapper.getAll(), {
				some: 'value',
				some2: 'value2'
			});
		});
	});
});
