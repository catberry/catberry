'use strict';

module.exports = PagesModule;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(PagesModule, ModuleBase);

/**
 * Creates new instance of Pages module.
 * @constructor
 * @extends ModuleBase
 */
function PagesModule() {
	ModuleBase.call(this);
}

/**
 * Renders page tabs.
 * This method is called when need to render index template of module pages.
 * @param {Function} callback Callback on finish prepare data context.
 */
PagesModule.prototype.renderIndex = function (callback) {
	if (!this.$context.state.page) {
		this.$context.redirect('/about');
	}
	callback(null, {page: this.$context.state.page});
};