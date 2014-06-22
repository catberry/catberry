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

var util = require('util'),
	path = require('path'),
	uhr = require('catberry-uhr'),
	BootstrapperBase = require('../BootstrapperBase'),
	Catberry = require('./Catberry'),
	urlMappers,
	Log4js = require('log4js');

// try to load list of URL mappers
try {
	urlMappers = require(path.join(process.cwd(), 'map'));
} catch (e) {
	// nothing to do here
}
urlMappers = urlMappers || [];

util.inherits(Bootstrapper, BootstrapperBase);

/**
 * Creates new instance of server catberry bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
function Bootstrapper() {
	BootstrapperBase.call(this, Catberry);
}

/**
 * Configures catberry locator.
 * @param {Object} configObject Config object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
Bootstrapper.prototype.configure = function (configObject, locator) {
	BootstrapperBase.prototype.configure.call(this, configObject, locator);
	if (!configObject.clientTemplateEnginePath) {
		configObject.clientTemplateEnginePath = path.relative(
			path.join(__dirname, '..', 'client'),
			path.join(require.resolve('dustjs-linkedin'), '..', '..',
				'dist', 'dust-core.js'));
	}
	locator.register('moduleLoader',
		require('./ModuleLoader'), configObject, true);
	locator.register('resourceBuilder',
		require('./ResourceBuilder'), configObject, true);
	locator.register('pageRenderer',
		require('./PageRenderer'), configObject, true);
	locator.register('requestRouter',
		require('./RequestRouter'), configObject, true);
	locator.register('templateProvider',
		require('./TemplateProvider'), configObject, true);
	locator.register('clientBundleBuilder',
		require('./ClientBundleBuilder'), configObject, true);
	locator.register('moduleApiProvider',
		require('./ModuleApiProvider'), configObject, true);

	uhr.registerOnServer(locator);

	locator.registerInstance('jQuery', require('jquery'));

	var logger = Log4js.getLogger('catberry');
	locator.registerInstance('logger', logger);
	process.on('uncaughtException', function (error) {
		logger.fatal(error);
	});

	urlMappers.forEach(function (mapping) {
		locator.registerInstance('urlMapper', mapping);
	});
};

module.exports = new Bootstrapper();