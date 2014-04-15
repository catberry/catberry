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
	ServiceLocator = require('catberry-locator'),
	UrlMappingProvider = require('../lib/UrlMappingProvider');

describe('UrlMappingProvider', function () {
	describe('#map', function () {
		it('should check url for all mappers and replace url', function () {
			var locator = new ServiceLocator();
			locator.registerInstance('serviceLocator', locator);

			locator.registerInstance('urlMapper', {
				expression: /\/test12(.)*/i,
				map: function (url) {
					url.pathname += 'test2';
					return url;
				}
			});
			locator.registerInstance('urlMapper', {
				expression: /\/test1(.)*3/i,
				map: function (url) {
					url.pathname += 'test1';
					return url;
				}
			});

			var urlMappingProvider = locator.resolveInstance(UrlMappingProvider),
				mappedUrl1 = urlMappingProvider.map('http://localhost:3000/test123'),
				mappedUrl2 = urlMappingProvider.map('/test12');

			assert.strictEqual(mappedUrl1, 'http://localhost:3000/test123test1');
			assert.strictEqual(mappedUrl2, '/test12test2');
		});

		it('should return the same url if mapper is not found', function () {
			var locator = new ServiceLocator();
			locator.registerInstance('serviceLocator', locator);

			locator.registerInstance('urlMapper', {
				expression: /\/test12(.)*/i,
				map: function (url) {
					url.pathname += 'test2';
					return url;
				}
			});
			locator.registerInstance('urlMapper', {
				expression: /\/test1(.)*3/i,
				map: function (url) {
					url.pathname += 'test1';
					return url;
				}
			});

			var urlMappingProvider = locator.resolveInstance(UrlMappingProvider),
				mappedUrl1 = urlMappingProvider.map('http://localhost:3000/t123'),
				mappedUrl2 = urlMappingProvider.map('/t12');

			assert.strictEqual(mappedUrl1, 'http://localhost:3000/t123');
			assert.strictEqual(mappedUrl2, '/t12');
		});

		it('should return the same url if no one mapper is registered',
			function () {
				var locator = new ServiceLocator();
				locator.registerInstance('serviceLocator', locator);

				var urlMappingProvider = locator.resolveInstance(UrlMappingProvider),
					mappedUrl1 =
						urlMappingProvider.map('http://localhost:3000/t123'),
					mappedUrl2 =
						urlMappingProvider.map('/t12');

				assert.strictEqual(mappedUrl1, 'http://localhost:3000/t123');
				assert.strictEqual(mappedUrl2, '/t12');
			});
	});
});
