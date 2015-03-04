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

// This script helps to prepare release with correct documentation links in
// README.md file

var packageInfo = require('./package.json'),
	path = require('path'),
	fs = require('fs'),
	version = packageInfo.version;

var REPOSITORY_LINK_REGEXP =
	/(https:\/\/github.com\/catberry\/catberry\/blob\/)([0-9\-a-z\.]+)(\/)/gi,
	PACKAGE_REGEXP = /(Catberry@)([0-9\-a-z\.]+)/gi,
	PATHS = [
		'README.md',
		'lib/helpers/errorHelper.js',
		'lib/base/CatberryBase.js'
	];

PATHS.forEach(function (currentPath) {
	var absolutePath = path.join(__dirname, currentPath),
		options = {encoding: 'utf8'},
		buffer = '';

	console.log('Reading...');
	fs.createReadStream(absolutePath, options)
		.on('data', function (chunk) {
			buffer += chunk;
		})
		.on('end', function () {
			console.log('Replacing...');
			buffer = buffer
				.replace(REPOSITORY_LINK_REGEXP, '$1' + version + '$3')
				.replace(PACKAGE_REGEXP, '$1' + version);
			console.log('Writing...');
			fs.createWriteStream(absolutePath, options)
				.write(buffer);
			console.log('Done.');
		});
});
