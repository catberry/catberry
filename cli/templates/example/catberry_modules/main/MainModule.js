'use strict';

module.exports = MainModule;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(MainModule, ModuleBase);

var SUBTITLES = {
	about: 'About Catberry Framework',
	commits: 'Commits to Catberry Framework repository',
	search: 'Search in Catberry code'
};

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
 * This method is called when need to render "head" template of module "main".
 * @param {Function} callback Callback on finish prepare data context.
 */
MainModule.prototype.renderHead = function (callback) {
	callback(null, {
		title: this._title,
		subtitle: SUBTITLES[this.$context.state.page]
	});
};
