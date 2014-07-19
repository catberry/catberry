'use strict';

module.exports = AboutModule;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(AboutModule, ModuleBase);

/**
 * Creates new instance of About module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @constructor
 * @extends ModuleBase
 */
function AboutModule($uhr) {
	ModuleBase.call(this);
	this._uhr = $uhr;
}

/**
 * Current UHR instance.
 * @type {UHR}
 * @private
 */
AboutModule.prototype._uhr = null;

/**
 * Renders document about Catberry Framework.
 * This method is called when need to render "index" template of module "about".
 * @param {Function} callback Callback on finish prepare data context.
 */
AboutModule.prototype.renderIndex = function (callback) {
	this._uhr.get('https://api.github.com/repos/catberry/catberry/readme', {
			headers: {
				Accept: 'application/vnd.github.VERSION.html+json'
			}
		},
		function (error, status, data) {
			if (error) {
				callback(error);
				return;
			}
			if (status.code >= 400 && status.code < 600) {
				callback(new Error(status.text));
				return;
			}
			callback(null, {html: data});
		});
};