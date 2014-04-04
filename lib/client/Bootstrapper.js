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

/**
 * This module is a template and it is used only with some string replaces
 * by ClientBundleBuilder module. It does not work by itself.
 */

'use strict';

var modules = [
/**__modules**/
];

var placeholders = [
/**__placeholders**/
];

var util = require('util'),
	urlMappers = '__urlMappers' || [],
	templateEngine = '__templateEngine',
	Catberry = require('./Catberry'),
	jQuery = require('jquery'),
	Logger = require('./Logger'),
	StateProvider = require('./StateProvider'),
	ModuleLoader = require('./ModuleLoader'),
	PageRenderer = require('./PageRenderer'),
	RequestRouter = require('./RequestRouter'),
	EventRouter = require('./EventRouter'),
	FormSubmitter = require('./FormSubmitter'),
	TemplateProvider = require('./TemplateProvider'),
	ModuleApiProvider = require('./ModuleApiProvider'),
	BootstrapperBase = require('../BootstrapperBase');

util.inherits(Bootstrapper, BootstrapperBase);

/**
 * Creates new instance of client catberry bootstrapper.
 * @constructor
 * @extends BootstrapperBase
 */
function Bootstrapper() {
	BootstrapperBase.call(this, Catberry);
}

/**
 * Configures catberry service locator.
 * @param {Object} configObject Application config object.
 * @param {ServiceLocator} locator Service locator to configure.
 */
Bootstrapper.prototype.configure = function (configObject, locator) {
	BootstrapperBase.prototype.configure.call(this, configObject, locator);
	var loggerConfig = configObject.logger || {};
	locator.registerInstance('logger', new Logger(loggerConfig.levels));
	locator.registerInstance('window', window);

	locator.register('stateProvider', StateProvider, configObject, true);
	locator.register('moduleLoader', ModuleLoader, configObject, true);
	locator.register('pageRenderer', PageRenderer, configObject, true);
	locator.register('requestRouter', RequestRouter, configObject, true);
	locator.register('eventRouter', EventRouter, configObject, true);
	locator.register('formSubmitter', FormSubmitter, configObject, true);
	locator.register('templateProvider', TemplateProvider, configObject, true);
	locator.register('moduleApiProvider',
		ModuleApiProvider, configObject, true);

	locator.registerInstance('templateEngine', templateEngine);
	locator.registerInstance('jQuery', jQuery);

	urlMappers.forEach(function (mapping) {
		locator.registerInstance('urlMapper', mapping);
	});

	modules.forEach(function (module) {
		locator.registerInstance('module', module);
	});

	placeholders.forEach(function (placeholder) {
		locator.registerInstance('placeholder', placeholder);
	});
};

module.exports = new Bootstrapper();