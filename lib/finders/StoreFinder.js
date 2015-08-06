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
	events = require('events'),
	chokidar = require('chokidar'),
	util = require('util'),
	glob = require('glob');

var DEFAULT_STORES_ROOT = 'catberry_stores',
	STORES_GLOB = '**/*.js';

var CHOKIDAR_OPTIONS = {
	ignoreInitial: true,
	cwd: process.cwd(),
	ignorePermissionErrors: true
};

util.inherits(StoreFinder, events.EventEmitter);

/**
 * Creates new instance of store finder.
 * @param {EventEmitter} $eventBus Event bus to exchange events.
 * @param {String} storesDirectory Relative path to directory with store files.
 * @extends EventEmitter
 * @constructor
 */
function StoreFinder($eventBus, storesDirectory) {
	events.EventEmitter.call(this);
	this._eventBus = $eventBus;
	this._storesDirectory = storesDirectory || DEFAULT_STORES_ROOT;
	this._storesGlobExpression = path.join(this._storesDirectory, STORES_GLOB);
	this._storesGlobExpression = requireHelper.getValidPath(
		this._storesGlobExpression
	);
	this._storesDirectory = requireHelper.getValidPath(this._storesDirectory);
}

/**
 * Current file watcher.
 * @type {FSWatcher}
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
 * Current folder with Catberry stores.
 * @type {string}
 */
StoreFinder.prototype._storesDirectory = '';

/**
 * Current glob for store files.
 * @type {string}
 */
StoreFinder.prototype._storesGlobExpression = '';

/**
 * Current set of last found stores.
 * @type {Object}
 * @private
 */
StoreFinder.prototype._foundStores = null;

/**
 * Finds all paths to stores.
 * @returns {Promise<Object>} Promise for set of found stores by names.
 */
StoreFinder.prototype.find = function () {
	if (this._foundStores) {
		return Promise.resolve(this._foundStores);
	}

	this._foundStores = Object.create(null);
	var self = this;

	return new Promise(function (fulfill, reject) {
		var storeFilesGlob = new glob.Glob(
			self._storesGlobExpression, {
				nosort: true,
				silent: true,
				nodir: true
			}
		);

		storeFilesGlob
			.on('match', function (match) {
				var storeDescriptor = self._createStoreDescriptor(match);
				self._foundStores[storeDescriptor.name] = storeDescriptor;
				self._eventBus.emit('storeFound', storeDescriptor);
			})
			.on('error', function (error) {
				reject(error);
			})
			.on('end', function () {
				fulfill();
			});
	})
		.then(function () {
			return self._foundStores;
		});
};

/**
 * Creates found store descriptor.
 * @param {string} filename Store filename.
 * @returns {{name: string, path: string}} Found store descriptor.
 * @private
 */
StoreFinder.prototype._createStoreDescriptor = function (filename) {
	var relative = path.relative(this._storesDirectory, filename),
		basename = path.basename(relative, '.js'),
		directory = path.dirname(relative),
		storeName = directory !== '.' ?
		path.dirname(relative) + path.sep + basename : basename;

	return {
		name: requireHelper.getValidPath(storeName),
		path: path.relative(process.cwd(), filename)
	};
};

/**
 * Watches components for changing.
 */
StoreFinder.prototype.watch = function () {
	if (this._fileWatcher) {
		return;
	}

	var self = this;
	this._fileWatcher = chokidar.watch(
		this._storesGlobExpression, CHOKIDAR_OPTIONS
	)
		.on('error', function (error) {
			self._eventBus.emit('error', error);
		})
		.on('add', function (filename) {
			var store = self._createStoreDescriptor(filename);
			self._foundStores[store.name] = store;
			self.emit('add', store);
		})
		.on('change', function (filename) {
			var store = self._createStoreDescriptor(filename);
			delete self._foundStores[store.name];
			self._foundStores[store.name] = store;
			self.emit('change', store);
		})
		.on('unlink', function (filename) {
			var store = self._createStoreDescriptor(filename);
			delete self._foundStores[store.name];
			self.emit('unlink', store);
		});
};