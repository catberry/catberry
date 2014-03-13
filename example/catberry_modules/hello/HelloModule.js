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

module.exports = HelloModule;

function HelloModule($logger, title) {
	this._title = title;
	this._logger = $logger;
}

HelloModule.prototype._title = '';
HelloModule.prototype._logger = null;

HelloModule.prototype.render = function (placeholder, args, callback) {
	var content;
	switch (placeholder.name) {
		case '__index':
			this._logger.trace('index placeholder render');
			content = placeholder.template({title: this._title});
			callback(null, content);
			break;
		case 'hello-world':
			this._logger.trace('hello-world placeholder render');
			content = placeholder.template({who: args.who });
			callback(null, content);
			break;
		case 'signature':
			this._logger.trace('signature placeholder render');
			if (!args.author) {
				callback(new Error('No author!'), null);
				return;
			}
			content = placeholder.template({author: args.author });
			callback(null, content);
			break;
		case 'subtitle':
			this._logger.trace('subtitle placeholder render');
			content = placeholder.template();
			setTimeout(function () {
				callback(null, content);
			}, 2000);
			break;
		default:
			callback(new Error('No such placeholder'), '');
	}
};

HelloModule.prototype.handle = function (eventName, placeholder, callback) {

};

HelloModule.prototype.submit = function (formName, formObject, callback) {

};