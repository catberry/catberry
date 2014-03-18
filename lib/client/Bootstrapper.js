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

var modules = [
/**__modules**/
];

var placeholders = [
/**__placeholders**/
];

var util = require('util'),
	Logger = require('./Logger'),
	ModuleLoader = require('./ModuleLoader'),
	PageRenderer = require('./PageRenderer'),
	RequestRouter = require('./RequestRouter'),
	TemplateProvider = require('./TemplateProvider'),
	BootstrapperBase = require('../BootstrapperBase');

util.inherits(Bootstrapper, BootstrapperBase);

/**
 * Creates new instance of client catberry bootstrapper.
 * @constructor
 */
function Bootstrapper() {
	BootstrapperBase.call(this);
}

/**
 * Configures catberry locator.
 * @param {Object} configObject Config object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
Bootstrapper.prototype.configure = function (configObject, locator) {
	var loggerConfig = configObject.logger || {};
	locator.registerInstance('logger', new Logger(loggerConfig.levels));
	locator.registerInstance('config', configObject);

	locator.register('moduleLoader', ModuleLoader, configObject, true);
	locator.register('pageRenderer', PageRenderer, configObject, true);
	locator.register('requestRouter', RequestRouter, configObject, true);
	locator.register('templateProvider', TemplateProvider, configObject, true);

	modules.forEach(function (module) {
		locator.registerInstance('module', {
			name: module.name,
			implementation: locator.resolveInstance(module.implementation,
				configObject)
		});
	});

	placeholders.forEach(function (placeholder) {
		locator.registerInstance('placeholder', placeholder);
	});
};

module.exports = (new Bootstrapper()).create();