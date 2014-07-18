#!/usr/bin/env node
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

var fs = require('fs'),
	readline = require('readline'),
	program = require('commander'),
	path = require('path'),
	templatesRoot = path.join(__dirname, '..', 'templates'),
	ncp = require('ncp'),
	packageInfo = require('../package.json'),
	version = packageInfo.version;

program.version(version)
	.command('init <template>')
	.description('Initialize Catberry project template')
	.option('-D, --dist <path>', 'change destination directory')
	.action(function (template, options) {
		options.dist = options.dist || process.cwd();
		if (!fs.existsSync(options.dist)) {
			console.log('Destination does not exist');
			return;
		}
		if (fs.readdirSync(options.dist).length !== 0) {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Destination is not empty, continue? (y/n): ',
				function (answer) {
					answer = answer || 'n';
					if (answer[0] === 'y') {
						copyTemplateTo(template, options.dist);
					}
					rl.close();
				});
		} else {
			copyTemplateTo(template, options.dist);
		}
	});

program.parse(process.argv);

/**
 * Copies project template to specified destination.
 * @param {string} template Name of template to copy.
 * @param {string} destination Destination where to copy.
 */
function copyTemplateTo(template, destination) {
	var templateFolder = path.join(templatesRoot, template);
	if (!fs.existsSync(templateFolder)) {
		console.log('No such template. Templates are:\n');
		fs.readdirSync(templatesRoot).forEach(function (name) {
			console.log('\t' + name);
		});
		return;
	}
	ncp(templateFolder, destination, function (error) {
		if (error) {
			return console.error(error);
		}
		console.log('\nProject template has been deployed to "' +
			destination + '"');
		console.log('\nNow install dependencies:\n\n\tnpm install\n');
		console.log('Then to start in debug mode without code ' +
			'minification and with file watch:\n\n\tnpm run debug\n');
		console.log('To start in release mode with code ' +
			'minification and without file watch:\n\n\tnpm start\n');
	});
}