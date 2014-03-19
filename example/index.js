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

var catberry = require('catberry');

// catberry builds all required resources on startup
// and we can easy clean all built resources
if (process.argv.length === 3 && process.argv[2] === 'clean') {
	catberry
		.create()
		.clean(function () {
			process.exit(0);
		});
} else {
	var http = require('http'),
		path = require('path'),
		publicPath = path.join(__dirname, 'public'),
		connect = require('connect'),
		cat = catberry.create({
			title: 'Catberry example module',
			publicPath: publicPath,
			// by default catberry is in debug mode
			isRelease: process.argv.length === 3 &&
				process.argv[2] === 'release'
		}),
		app = connect();

	app.use(cat.getRouter());
	app.use(connect.static(publicPath));
	app.use(connect.errorHandler());
	http
		.createServer(app)
		.listen(3000);
}