'use strict';

const assert = require('assert');
const ServiceLocator = require('catberry-locator');
const CookieWrapper = require('../../browser/CookieWrapper');
const testCases = require('../cases/lib/CookieWrapper.json');

/* eslint prefer-arrow-callback:0 */
/* eslint max-nested-callbacks:0 */
/* eslint require-jsdoc:0 */
describe('browser/CookieWrapper', function() {
	describe('#get', function() {
		testCases.get.forEach(testCase => {
			it(testCase.name, function() {
				const locator = createLocator(testCase.cookieString);
				const cookieWrapper = new CookieWrapper(locator);
				testCase.checkCookies.forEach(check => {
					assert.strictEqual(cookieWrapper.get(check.key), check.value);
				});
			});
		});
	});
	describe('#set', function() {
		testCases.set.forEach(testCase => {
			it(testCase.name, function() {
				const locator = createLocator(null);
				const cookieWrapper = new CookieWrapper(locator);
				const window = locator.resolve('window');
				testCase.cookies.forEach(cookie => {
					if (cookie.expires) {
						cookie.expires = new Date(cookie.expires);
					}
					cookieWrapper.set(cookie);
				});
				assert.deepEqual(window.document.cookieSetups, testCase.expectedStrings);
				assert.deepEqual(window.document.cookie, testCase.expectedDocumentString);
			});
		});

		it('should set default expire date by max age', function() {
			const locator = createLocator(null);
			const cookieWrapper = new CookieWrapper(locator);
			const expiration = new Date(Date.now() + 3600000);
			const window = locator.resolve('window');
			const expected = `some=value; Max-Age=3600; Expires=${expiration.toUTCString()}`;

			cookieWrapper.set({
				key: 'some',
				value: 'value',
				maxAge: 3600
			});

			assert.strictEqual(window.document.cookieSetups.length, 1);
			assert.strictEqual(window.document.cookieSetups[0], expected);
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
				const locator = createLocator(testCase.initString);
				const cookieWrapper = new CookieWrapper(locator);
				testCase.cookies.forEach(cookie => cookieWrapper.set(cookie));
				assert.strictEqual(cookieWrapper.getCookieString(), testCase.expected);
			});
		});
	});

	describe('#getAll', function() {
		testCases.getAll.forEach(testCase => {
			it(testCase.name, function() {
				const locator = createLocator(testCase.initString);
				const cookieWrapper = new CookieWrapper(locator);
				testCase.cookies.forEach(cookie => cookieWrapper.set(cookie));
				assert.deepEqual(cookieWrapper.getAll(), testCase.expected);
			});
		});
	});
});

function createLocator(cookieString) {
	const locator = new ServiceLocator();
	const documentCookie = cookieString ? cookieString.split(/ |;/g) : [];
	locator.registerInstance('window', {
		document: {
			get cookieSetups() {
				return documentCookie;
			},
			get cookie() {
				return documentCookie
					.map(str => str.match(/^([^; ]+)/gi))
					.filter(str => str)
					.join('; ');
			},
			set cookie(str) {
				documentCookie.push(str);
			}
		}
	});
	return locator;
}
