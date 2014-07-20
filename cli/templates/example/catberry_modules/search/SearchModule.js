'use strict';

module.exports = SearchModule;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(SearchModule, ModuleBase);

/**
 * Creates new instance of Commits module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @constructor
 * @extends ModuleBase
 */
function SearchModule($uhr) {
	ModuleBase.call(this);
	this._uhr = $uhr;
}

/**
 * Current UHR instance.
 * @type {UHR}
 * @private
 */
SearchModule.prototype._uhr = null;

/**
 * Renders result list for search query in Catberry Framework repository.
 * This method is called when need to render "index" template
 * of module "search".
 * @param {Function} callback Callback on finish prepare data context.
 */
SearchModule.prototype.renderResults = function (callback) {
	if (this.$context.state.query) {
		this._uhr.get('https://api.github.com/search/code?q=' +
				this.$context.state.query +
				'+in:file+repo:catberry/catberry',
			{},
			function (error, status, data) {
				if (error) {
					callback(error);
					return;
				}
				if (status.code >= 400 && status.code < 600) {
					callback(new Error(status.text));
					return;
				}
				callback(null, data);
			});
	} else {
		callback(null);
	}
};

/**
 * Renders search form.
 * This method is called when need to render "form" template of module "search".
 * @param {Function} callback Callback on finish prepare data context.
 */
SearchModule.prototype.renderForm = function (callback) {
	callback(null, {query: this.$context.state.query});
};

/**
 * Searches in code of Catberry repository.
 * @param {Object} formObject Serialized form object.
 * @param {Function} callback Callback on finish submitting.
 */
SearchModule.prototype.submitSearchInCode = function (formObject, callback) {
	if (formObject.query) {
		this.$context.redirect('/search?query=' + formObject.query);
	}
	callback();
};