'use strict';

module.exports = MainModule;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(MainModule, ModuleBase);

/**
 * Creates new instance of main module.
 * @param {string} title Site title.
 * @constructor
 * @extends ModuleBase
 */
function MainModule(title) {
	ModuleBase.call(this);
	this._title = title;
}

/**
 * Current site title.
 * @type {string}
 * @private
 */
MainModule.prototype._title = '';

/**
 * Renders HEAD element of page.
 * @param {Function} callback Callback on finish prepare data context.
 */
MainModule.prototype.renderHead = function (callback) {
	callback(null, {title: this._title});
};

/**
 * Renders root template on page.
 * @param {Function} callback Callback on finish prepare data context.
 */
MainModule.prototype.renderIndex = function (callback) {
	callback(null, {message: 'Hello, world!'});
};
