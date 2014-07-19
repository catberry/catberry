'use strict';

module.exports = CommitsModule;

var util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(CommitsModule, ModuleBase);

/**
 * Creates new instance of Commits module.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @param {jQuery} $jQuery jQuery library.
 * @param {TemplateProvider} $templateProvider jQuery library.
 * @constructor
 * @extends ModuleBase
 */
function CommitsModule($uhr, $jQuery, $templateProvider) {
	ModuleBase.call(this);
	this._uhr = $uhr;
	this.$ = $jQuery;
	this._templateProvider = $templateProvider;
}

/**
 * Current UHR instance.
 * @type {UHR}
 * @private
 */
CommitsModule.prototype._uhr = null;

/**
 * Current template provider.
 * @type {TemplateProvider}
 * @private
 */
CommitsModule.prototype._templateProvider = null;

/**
 * Current jQuery instance.
 * @type {jQuery}
 */
CommitsModule.prototype.$ = null;

/**
 * Renders commit list of Catberry Framework repository.
 * This method is called when need to render "index" template
 * of module "commits".
 * @param {Function} callback Callback on finish prepare data context.
 */
CommitsModule.prototype.renderIndex = function (callback) {
	this._uhr.get('https://api.github.com/repos/catberry/catberry/commits',
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
			callback(null, {commits: data});
		});
};

/**
 * Handles commit details hash change.
 * @param {boolean} isStarted Is hash just set.
 * @param {Object} args Event arguments.
 * @param {Function} callback Callback on finish handling event.
 */
CommitsModule.prototype.handleDetails = function (isStarted, args, callback) {
	if (!isStarted) {
		this.$('#details-' + args.sha).remove();
		callback();
		return;
	}

	var self = this,
		link = this.$('#' + args.sha);

	link.addClass('loading');

	this._uhr.get('https://api.github.com/repos/catberry/catberry/commits/' +
			args.sha,
		{},
		function (error, status, data) {
			link.removeClass('loading');
			if (error) {
				callback(error);
				return;
			}
			if (status.code >= 400 && status.code < 600) {
				callback(new Error(status.text));
				return;
			}

			var content = '';

			self._templateProvider
				.getStream('commits_details', data)
				.on('data', function (chunk) {content += chunk;})
				.on('error', callback)
				.on('end', function () {
					self.$(content)
						.attr('id', 'details-' + args.sha)
						.insertAfter(link);
					callback(null);
				});
		});
};