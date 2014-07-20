'use strict';

module.exports = __ModuleName__Module;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(__ModuleName__Module, ModuleBase);

/**
 * Creates new instance of "__moduleName__" module.
 * @constructor
 * @extends ModuleBase
 */
function __ModuleName__Module() {
	ModuleBase.call(this);
}

/**
 * Renders root template on page.
 * This method is called when need to render "index" template
 * of module "__moduleName__".
 * @param {Function} callback Callback on finish prepare data context.
 */
__ModuleName__Module.prototype.renderIndex = function (callback) {
	callback(null, {text: 'Awesome content'});
};