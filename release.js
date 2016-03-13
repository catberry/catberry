'use strict';

// This script helps to prepare release with correct documentation links in
// README.md file

const packageInfo = require('./package.json');
const path = require('path');
const fs = require('fs');
const version = packageInfo.version;

const REPOSITORY_LINK_REGEXP = /(https:\/\/github.com\/catberry\/catberry\/blob\/)([0-9\-a-z\.]+)(\/)/gi;
const PACKAGE_REGEXP = /(Catberry@)([0-9\-a-z\.]+)/gi;
const CATBERRY_PROPERTY_REGEXP = /(this\.version\s*=\s*')([0-9\-a-z\.]+)/i;
const PATHS = [
	'README.md',
	'CONTRIBUTING.md',
	'lib/helpers/errorHelper.js',
	'lib/base/CatberryBase.js'
];

/* eslint no-console: 0 */
PATHS.forEach(currentPath => {
	const absolutePath = path.join(__dirname, currentPath);
	const options = {
		encoding: 'utf8'
	};
	let buffer = '';

	console.log('Reading...');
	fs.createReadStream(absolutePath, options)
		.on('data', chunk => {
			buffer += chunk;
		})
		.on('end', () => {
			console.log('Replacing...');
			buffer = buffer
				.replace(REPOSITORY_LINK_REGEXP, `$1${version}$3`)
				.replace(PACKAGE_REGEXP, `$1${version}`)
				.replace(CATBERRY_PROPERTY_REGEXP, `$1${version}`);
			console.log('Writing...');
			fs.createWriteStream(absolutePath, options).write(buffer);
			console.log('Done.');
		});
});
