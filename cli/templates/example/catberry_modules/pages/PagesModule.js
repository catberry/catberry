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
 * Renders page content.
 * This method is called when need to render index template of module pages.
 * @param {Function} callback Callback on finish prepare data context.
 */
PagesModule.prototype.renderIndex = function (callback) {
	callback(null, {page: this.$context.state.page});
};

/**
 * Renders page navigation tabs.
 * This method is called when need to render "navigation" template
 * of module "pages".
 * @param {Function} callback Callback on finish prepare data context.
 */
PagesModule.prototype.renderNavigation = function (callback) {
	if (!this.$context.state.page) {
		this.$context.redirect('/about');
		callback();
		return;
	}
	var data = {};
	data[this.$context.state.page] = true;
	callback(null, data);
};