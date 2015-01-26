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

module.exports = StoreFinder;

var path = require('path'),
	requireHelper = require('../helpers/requireHelper'),
	util = require('util'),
	glob = require('glob');

var DEFAULT_STORES_ROOT = 'catberry_stores',
	STORES_GLOB = '**/*.js';

/**
 * Creates new instance of store finder.
 * @param {EventEmitter} $eventBus Event bus to exchange events.
 * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
 * @param {String} storesDirectory Name of folder with store files.
 * @constructor
 */
function StoreFinder($eventBus, $serviceLocator, storesDirectory) {
	this._eventBus = $eventBus;
	this._storesDirectory = path.join(
		process.cwd(), storesDirectory || DEFAULT_STORES_ROOT
	);
	this._storesGlobExpression = path.join(this._storesDirectory, STORES_GLOB);
	this._storesGlobExpression = requireHelper.getValidPath(
		this._storesGlobExpression
	);
	this._storesDirectory = requireHelper.getValidPath(this._storesDirectory);
	this._serviceLocator = $serviceLocator;
}

/**
 * Current file watcher.
 * @type {FileWatcher}
 * @private
 */
StoreFinder.prototype._fileWatcher = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
StoreFinder.prototype._eventBus = null;
/**
 * Current folder with catberry modules.
 * @type {string}
 */
StoreFinder.prototype._storesDirectory = '';

/**
 * Current glob for store files.
 * @type {string}
 */
StoreFinder.prototype._storesGlobExpression = '';

/**
 * Current service locator.
 * @type {ServiceLocator}
 * @private
 */
StoreFinder.prototype._serviceLocator = null;

/**
 * Finds all paths to stores.
 * @returns {Promise<Object>} Promise for set of stores by names.
 */
StoreFinder.prototype.find = function () {
	if (this._fileWatcher) {
		this._fileWatcher.unwatch();
	}

	var self = this;
	return new Promise(function (fulfill, reject) {
		var result = {},
			storeFilesGlob = new glob.Glob(self._storesGlobExpression);

		storeFilesGlob
			.on('match', function (match) {
				var relative = path.relative(self._storesDirectory, match),
					basename = path.basename(relative, '.js'),
					directory = path.dirname(relative),
					storeName = directory !== '.' ?
						path.dirname(relative) + '/' + basename : basename;

				result[storeName] = {
					name: storeName,
					path: path.relative(process.cwd(), match)
				};
				self._eventBus.emit('storeFound', result[storeName]);
			})
			.on('error', function (error) {
				reject(error);
			})
			.on('end', function () {
				fulfill(result);
			});
	})
		.then(function (result) {
			self._fileWatcher = self._serviceLocator.resolve('fileWatcher');
			return result;
		});
};

/**
 * Watches components for changing.
 * @param {Function} handler Change handler.
 */
StoreFinder.prototype.watch = function (handler) {
	if (!this._fileWatcher) {
		return;
	}

	this._fileWatcher.watch([this._storesGlobExpression], handler);
};