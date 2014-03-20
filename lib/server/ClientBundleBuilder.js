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

module.exports = ClientBundleBuilder;

var path = require('path'),
	util = require('util'),
	fs = require('fs'),
	browserify = require('browserify');

var DEFAULT_PUBLIC_DIRECTORY = path.join(process.cwd(), 'public'),
	CLIENT_ROOT_PATH = path.resolve(path.join(__dirname, '..', 'client')),
	INFO_BUNDLE_BUILT = 'Client bundle successfully built (%s)',
	TEMPORARY_BOOTSTRAPPER_FILENAME = '__bundle_entry.js',
	BOOTSTRAPPER_FILENAME = 'Bootstrapper.js',
	BUNDLE_FILENAME = 'catberry.js',
	MODULES_REPLACE = '/**__modules**/',
	PLACEHOLDERS_REPLACE = '/**__placeholders**/';

/**
 * Creates new instance of client bundle builder.
 * @param {string} publicDirectoryPath Directory path where to publish bundle.
 * @param {Logger} $logger Logger ot log messages.
 * @param {TemplateProvider} $templateProvider Template provider to get
 * compiled sources.
 * @constructor
 */
function ClientBundleBuilder(publicDirectoryPath, $logger, $templateProvider) {
	this._logger = $logger;
	this._publicPath = publicDirectoryPath || DEFAULT_PUBLIC_DIRECTORY;
	this._templateProvider = $templateProvider;
	if (!fs.existsSync(this._publicPath)) {
		fs.mkdirSync(this._publicPath);
	}
}

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
ClientBundleBuilder.prototype._templateProvider = null;

/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ClientBundleBuilder.prototype._logger = null;

/**
 * Current path where to publish bundle.
 * @type {string}
 * @private
 */
ClientBundleBuilder.prototype._publicPath = '';

/**
 * Builds client bundle.
 * @param {Function} callback Callback on finish build.
 */
ClientBundleBuilder.prototype.build = function (callback) {

	// TODO load modules and placeholders and replace it in bootstrapper
	if (!fs.existsSync(this._publicPath)) {
		fs.mkdirSync(this._publicPath);
	}

	var self = this,
		bundlePath = path.join(this._publicPath, BUNDLE_FILENAME),
		browserifyInstance = browserify({
			basedir: CLIENT_ROOT_PATH
		}),
		bundleFile = fs.createWriteStream(bundlePath, {});

	browserifyInstance.require(path.join(CLIENT_ROOT_PATH,
		BOOTSTRAPPER_FILENAME),
		{expose: 'catberry'}
	);

	var plaeholders = this._generatePlaceholders();

	browserifyInstance
		.bundle(function (error) {
			if (error) {
				self._logger.error(error);
				return;
			}
			self._logger.info(util.format(INFO_BUNDLE_BUILT, bundlePath));
		})
		.pipe(bundleFile)
		.on('finish', callback);
};

ClientBundleBuilder.prototype._generateRequiresForModules = function () {

};

ClientBundleBuilder.prototype._generatePlaceholders = function () {
	var placeholders = Object
		.keys(this._templateProvider.compiledSources)
		.map(function (placeholderName) {
			return {
				name: placeholderName,
				compiledSource: this._templateProvider
					.compiledSources[placeholderName]
			};
		}, this);

	return JSON.stringify(placeholders);
};