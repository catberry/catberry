'use strict';

const assert = require('assert');
const CookieWrapper = require('../../lib/CookieWrapper');
const testCases = require('../cases/lib/CookieWrapper.json');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('lib/CookieWrapper', function() {
	var cookieWrapper;

	beforeEach(function() {
		cookieWrapper = new CookieWrapper();
	});

	describe('#get', function() {
		testCases.get.forEach(testCase => {
			it(testCase.name, function() {
				cookieWrapper.initWithString(testCase.cookieString);
				testCase.checkCookies.forEach(check => {
					assert.strictEqual(cookieWrapper.get(check.key), check.value);
				});
			});
		});
	});

	describe('#set', function() {
		testCases.set.forEach(testCase => {
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
		testCases.getCookieString.forEach(testCase => {
			it(testCase.name, function() {
				cookieWrapper.initWithString(testCase.initString);
				testCase.cookies.forEach(cookie => cookieWrapper.set(cookie));
				assert.strictEqual(cookieWrapper.getCookieString(), testCase.expected);
			});
		});
	});
	describe('#getAll', function() {
		testCases.getAll.forEach(testCase => {
			it(testCase.name, function() {
				cookieWrapper.initWithString(testCase.initString);
				testCase.cookies.forEach(cookie => cookieWrapper.set(cookie));
				assert.deepEqual(cookieWrapper.getAll(), testCase.expected);
			});
		});
	});
});
