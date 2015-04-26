/*
 * catberry
 *
 * Copyright (c) 2015 Denis Rechkunov and project contributors.
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
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = FileWatcher;

var chokidar = require('chokidar');

var OPTIONS = {
	//ignoreInitial: false,
	cwd: process.cwd(),
	ignorePermissionErrors: true
};

/**
 * Creates new instance of the file watcher.
 * @constructor
 */
function FileWatcher() {

}

/**
 * Current watch object.
 * @type {Chokidar}
 * @private
 */
FileWatcher.prototype._watcher = null;

/**
 * Watches after specified resources and invokes handler on changes.
 * @param {Array} globs Array of globs to watch.
 * @param {Function} handler Handler of all changes.
 */
FileWatcher.prototype.watch = function (globs, handler) {
	if (this._watcher) {
		return;
	}

	var self = this;
	this._watcher = chokidar.watch(globs, OPTIONS);
	this._watcher
		.on('change', handler)
		.on('error', function (error) {
			self._eventBus.emit('error', error);
		});
};

/**
 * Removes all watches from the list.
 */
FileWatcher.prototype.unwatch = function () {
	if (!this._watcher) {
		return;
	}
	this._watcher.close();
	this._watcher = null;
};