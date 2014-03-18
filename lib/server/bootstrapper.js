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

module.exports = bootstrapper;

var ServiceLocator = require('../ServiceLocator'),
	Catberry = require('../Catberry'),
	log4js = require('log4js'),
	logger = log4js.getLogger('catberry');

/**
 * Creates new full-configured instance of catberry.
 * @param {Object} config Configuration object.
 * @returns {Catberry}
 */
function bootstrapper(config) {

	var currentConfig = config || {},
		catberry = new Catberry();

	// server environment
	catberry.locator.register('moduleLoader',
		require('./ModuleLoader'), currentConfig, true);
	catberry.locator.register('resourceBuilder',
		require('./ResourceBuilder'), currentConfig, true);
	catberry.locator.register('pageRenderer',
		require('./PageRenderer'), currentConfig, true);
	catberry.locator.register('requestRouter',
		require('./RequestRouter'), currentConfig, true);
	catberry.locator.register('templateProvider',
		require('./TemplateProvider'), currentConfig, true);
	catberry.locator.registerInstance('logger', logger);
	catberry.locator.registerInstance('config', currentConfig);

	return catberry;
}