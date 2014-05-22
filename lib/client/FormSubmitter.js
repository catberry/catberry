/* 
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
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

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = FormSubmitter;

var moduleContextHelper = require('../helpers/moduleContextHelper');

var DATA_MODULE_ATTRIBUTE_NAME = 'data-module',
	DATA_DEPENDENTS_ATTRIBUTE_NAME = 'data-dependents',
	NAME_ATTRIBUTE_NAME = 'name',
	PLACEHOLDERS_ENUMERATION_SEPARATOR = '&';

/**
 * Creates new instance of form submitter.
 * @param {ModuleLoader} $moduleLoader Module loader to get set of modules.
 * @param {PageRenderer} $pageRenderer Page renderer to render placeholders
 * after form submit.
 * @param {Window} $window Current browser window.
 * @param {StateProvider} $stateProvider State provider
 * to render form dependents.
 * @constructor
 */
function FormSubmitter($moduleLoader, $pageRenderer, $window, $stateProvider) {
	this._modulesByNames = $moduleLoader.getModulesByNames();
	this._pageRenderer = $pageRenderer;
	this._window = $window;
	this._stateProvider = $stateProvider;
}

/**
 * Current state provider.
 * @type {StateProvider}
 * @private
 */
FormSubmitter.prototype._stateProvider = null;

/**
 * Current set of modules by names.
 * @type {Object}
 * @private
 */
FormSubmitter.prototype._modulesByNames = null;

/**
 * Current page renderer.
 * @type {PageRenderer}
 * @private
 */
FormSubmitter.prototype._pageRenderer = null;

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
FormSubmitter.prototype._window = null;

/**
 * Submits form to module.
 * @param {jQuery} form jQuery form wrapper.
 * @param {Function} callback Callback on finish.
 */
FormSubmitter.prototype.submit = function (form, callback) {
	if (!this.canSubmit(form)) {
		return;
	}

	var self = this,
		currentState = this._stateProvider.getCurrentState(),
		name = form.attr(NAME_ATTRIBUTE_NAME),
		receiver = form.attr(DATA_MODULE_ATTRIBUTE_NAME),
		submitValues = serializeFormToObject(form);

	form.find('input').prop('disabled', true);
	this._modulesByNames[receiver].implementation
		.submit(name, submitValues, function (error, then) {
			then = typeof(then) === 'function' ? then : dummy;

			if (error) {
				callback(error);
				then();
				return;
			}

			var lastError,
				dependents = getDataDependents(form, self._modulesByNames);

			var endCheckHandler = function () {
				if (dependents.length !== 0) {
					iteration();
					return;
				}
				callback(lastError);
				form.find('input').prop('disabled', false);
				then();
			};

			var iteration = function () {
				var current = dependents.shift();
				self._pageRenderer.renderPlaceholder(
					current, currentState, {}, function (error) {
						if (error) {
							lastError = error;
						}
						endCheckHandler();
					});
			};
			endCheckHandler();
		});
};

/**
 * Determines could specified form be submitted to any module.
 * @param {jQuery} form jQuery form element wrapper.
 * @returns {boolean} True if form could be submitted.
 */
FormSubmitter.prototype.canSubmit = function (form) {
	var name = form.attr(NAME_ATTRIBUTE_NAME),
		receiver = form.attr(DATA_MODULE_ATTRIBUTE_NAME);

	return Boolean(name) && Boolean(receiver) &&
		(receiver in this._modulesByNames);
};

/**
 * Serializes form to object.
 * @param {jQuery} form jQuery form wrapper.
 * @returns {Object}
 */
function serializeFormToObject(form) {
	var object = {};
	form.serializeArray()
		.forEach(function (inputItem) {
			object[inputItem.name] = inputItem.value;
		});

	return object;
}

/**
 * Gets all placeholders which data depends on for submit.
 * @param {jQuery} form jQuery form wrapper.
 * @param {Object} modules set of modules.
 * @returns {Array}
 */
function getDataDependents(form, modules) {
	var result = [],
		dependentsString = form.attr(DATA_DEPENDENTS_ATTRIBUTE_NAME);
	if (!dependentsString) {
		return result;
	}

	dependentsString
		.split(PLACEHOLDERS_ENUMERATION_SEPARATOR)
		.forEach(function (placeholderId) {
			var moduleAndContext = moduleContextHelper
				.splitModuleNameAndContext(placeholderId);

			if (!modules.hasOwnProperty(moduleAndContext.moduleName) ||
				!modules[moduleAndContext.moduleName]
					.placeholders.hasOwnProperty(moduleAndContext.context)) {
				return;
			}

			result.push(modules[moduleAndContext.moduleName]
				.placeholders[moduleAndContext.context]);
		});

	return result;
}

/**
 * Does nothing as default callback.
 */
function dummy() {}