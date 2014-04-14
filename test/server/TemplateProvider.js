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
	ServiceLocator = require('../../lib/ServiceLocator'),
	Logger = require('./../mocks/Logger'),
	path = require('path'),
	fs = require('fs'),
	TemplateProvider = require('../../lib/server/TemplateProvider');

var templatePath = path.join(__dirname, '..',
	'cases', 'server', 'TemplateProvider', 'case1', 'test.compiled');

describe('server/TemplateProvider', function () {
	describe('#registerCompiled', function () {
		it('should properly register compiled template', function (done) {
			var locator = new ServiceLocator();
			locator.register('logger', Logger);

			var provider = locator.resolveInstance(TemplateProvider),
				source = fs.readFileSync(templatePath, {encoding: 'utf8'});

			provider.registerCompiled('test', source);

			var templateStream = provider.getStream('test',
					{testMessage: 'hello'}),
				rendered = '';

			templateStream.on('data', function (chunk) {
				rendered += chunk.toString();
			});
			templateStream.on('end', function () {
				assert.strictEqual(rendered, 'hello', 'Wrong render');
				done();
			});
		});

		it('should throw error if template file not found', function () {
			var provider = new TemplateProvider();

			assert.throws(function () {
				provider.registerCompiled('test', 'wrong template');
			});
		});
	});
});