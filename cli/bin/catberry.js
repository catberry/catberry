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
	split = require('split'),
	mkdirp = require('mkdirp'),
	readline = require('readline'),
	program = require('commander'),
	path = require('path'),
	templatesRoot = path.join(__dirname, '..', 'templates'),
	modulePresetsRoot = path.join(__dirname, '..', 'module_presets'),
	ncp = require('ncp'),
	packageInfo = require('../package.json'),
	version = packageInfo.version;

var MODULE_REPLACEMENT_REAL = '__moduleName__',
	MODULE_REPLACEMENT_PASCAL = '__ModuleName__',
	MODULE_MAIN_FILE_POSTFIX = 'Module.js',
	MODULES_ROOT = 'catberry_modules',
	MODULE_MAIN = 'main',
	MODULE_NAME_REGEXP = /^[a-z]+[a-z0-9-]*$/i;

program.version(version);

program
	.command('init <template>')
	.description('Initialize Catberry project template')
	.option('-D, --dest <path>', 'change destination directory')
	.action(function (template, options) {
		options.dest = options.dest || process.cwd();
		if (!checkDestination(options.dest)) {
			return;
		}

		var isNotEmpty = fs.readdirSync(options.dest)
			.some(function (name) {
				return name && name[0] !== '.';
			});

		if (isNotEmpty) {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Destination directory is not empty, continue? (y/n): ',
				function (answer) {
					answer = (answer || 'n').toLowerCase();
					if (answer[0] === 'y') {
						copyTemplateTo(template, options.dest);
					}
					rl.close();
				});
		} else {
			copyTemplateTo(template, options.dest);
		}
	});

program
	.command('add <module_name>')
	.description('Add Catberry module to project')
	.option('-D, --dest <path>', 'change destination directory')
	.action(function (moduleName, options) {
		options.dest = options.dest || process.cwd();
		if (!checkDestination(options.dest)) {
			return;
		}

		if (typeof(moduleName) !== 'string' ||
			!MODULE_NAME_REGEXP.test(moduleName)) {
			console.log('Module name is incorrect (' +
				MODULE_NAME_REGEXP.toString() +
				')');
			return;
		}

		var modulePath = path.join(options.dest, MODULES_ROOT, moduleName);

		if (fs.existsSync(modulePath)) {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			rl.question('Module directory already exists, continue? (y/n): ',
				function (answer) {
					answer = (answer || 'n').toLowerCase();
					if (answer[0] === 'y') {
						createModule(moduleName, modulePath);
					}
					rl.close();
				});
		} else {
			createModule(moduleName, modulePath);
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
		console.log();
		return;
	}
	ncp(templateFolder, destination, function (error) {
		if (error) {
			return console.error(error);
		}
		console.log('\nProject template "' + template +
			'" has been deployed to "' + destination + '"');
		console.log('\nNow install dependencies:\n\n\tnpm install\n');
		console.log('Then to start in debug mode without code ' +
			'minification and with file watch:\n\n\tnpm run debug\n');
		console.log('To start in release mode with code ' +
			'minification and without file watch:\n\n\tnpm start\n');
	});
}

/**
 * Checks if destination exists.
 * @param {string} destination Path to destination folder.
 * @returns {boolean} If destination is valid.
 */
function checkDestination(destination) {
	if (!fs.existsSync(destination)) {
		console.log('Destination directory does not exist');
		return false;
	}

	if (!fs.statSync(destination).isDirectory()) {
		console.log('Destination is not a directory');
		return false;
	}

	return true;
}

/**
 * Creates module from preset in destination directory.
 * @param {string} moduleName Name of module.
 * @param {string} destination Destination directory.
 */
function createModule(moduleName, destination) {
	var pascalCaseName = toPascalCase(moduleName),
		copyOptions = {
			clobber: false
		},
		source = path.join(modulePresetsRoot,
				moduleName !== MODULE_MAIN ? 'other' : 'main');
	if (moduleName !== MODULE_MAIN) {
		copyOptions.transform = getTransform(moduleName, pascalCaseName);
	}

	mkdirp(destination, function (error) {
		if (error) {
			return console.error(error);
		}

		var successHandler = function () {
			console.log('\nModule "' + moduleName +
				'" has been created at "' + destination + '"\n');
		};

		ncp(source, destination, copyOptions, function (error) {
			if (error) {
				return console.error(error);
			}

			if (moduleName === MODULE_MAIN) {
				successHandler();
				return;
			}

			var moduleOldFilename = MODULE_REPLACEMENT_PASCAL +
					MODULE_MAIN_FILE_POSTFIX,
				moduleNewFilename = pascalCaseName + MODULE_MAIN_FILE_POSTFIX;

			fs.rename(path.join(destination, moduleOldFilename),
				path.join(destination, moduleNewFilename), function (error) {
					if (error) {
						return console.error(error);
					}
					successHandler();
				});
		});
	});
}

/**
 * Get transformation for replacements.
 * @param {string} moduleName Module name.
 * @param {string} pascalModuleName Module name in pascal case.
 * @returns {Function} Transform function for replacements.
 */
function getTransform(moduleName, pascalModuleName) {
	return function (read, write) {
		read
			.pipe(split(function (line) {
				return line
					.replace(MODULE_REPLACEMENT_REAL, moduleName)
					.replace(MODULE_REPLACEMENT_PASCAL, pascalModuleName) +
					'\n';
			}))
			.pipe(write);
	};
}

/**
 * Converts module name to PascalCaseName for module constructor.
 * @param {string} name Module name.
 * @returns {string} Name in Pascal Case.
 */
function toPascalCase(name) {
	var parts = name.split(/[^a-z0-9]/i),
		pascalCaseName = '';

	parts.forEach(function (part) {
		if (!part) {
			return;
		}

		pascalCaseName += part[0].toUpperCase();
		pascalCaseName += part.substring(1);
	});

	return pascalCaseName;
}