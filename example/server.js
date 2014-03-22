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

// define of require some external module you want use
// let's inject catberry logger into constructor
function ExternalModule($logger) {
	this._logger = $logger;
}
ExternalModule.prototype._logger = null;
// let's add method which will tell us which implementation now used
ExternalModule.prototype.foo = function () {
	this._logger.info('Client implementation of External module was loaded');
};

var catberry = require('catberry'),
// it is useful to recognize what is application mode now
	isRelease = process.argv.length === 3 &&
		process.argv[2] === 'release';

// catberry builds and compiles all required resources on startup
// and we can easy clean after catberry startup
// be careful! Whole public folder will be deleted!!!
if (process.argv.length === 3 && process.argv[2] === 'clean') {
	catberry
		.create()
		.clean(function () {
			process.exit(0);
		});
} else {
	// if we want to start catberry application using connect
	var http = require('http'),
		path = require('path'),
		publicPath = path.join(__dirname, 'public'),
		connect = require('connect'),
	// create instance of catberry application and pass config to it
		cat = catberry.create({
			title: 'Catberry example module',
			publicPath: publicPath,
			// by default catberry is in debug mode
			isRelease: isRelease
		}),
		app = connect();

	// then you could register your external modules to inject into catberry modules.
	cat.locator.register('externalModule', ExternalModule);

	// it is useful to compress response stream in production
	if (isRelease) {
		app.use(connect.compress());
	}
	// use catberry as connect/express middleware
	app.use(cat.getMiddleware());

	// all non-handled requests by catberry will be passed to next middleware
	app.use(connect.static(publicPath));
	app.use(connect.errorHandler());
	http
		.createServer(app)
		.listen(3000);
}

