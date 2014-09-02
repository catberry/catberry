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

var moduleHelper = require('../lib/helpers/moduleHelper');

var DATA_MODULE_ATTRIBUTE_NAME = 'data-module',
	DATA_DEPENDENTS_ATTRIBUTE_NAME = 'data-dependents',
	NAME_ATTRIBUTE_NAME = 'name',
	PLACEHOLDERS_ENUMERATION_SEPARATOR = '&';

// list of all possible inputs in form
// http://www.w3schools.com/html/html_forms.asp
var formInputs = [
	'input', 'textarea', 'fieldset', 'select',
	'optgroup', 'option', 'button', 'keygen'
];

/**
 * Creates new instance of form submitter.
 * @param {ModuleLoader} $moduleLoader Module loader to get set of modules.
 * @param {Window} $window Current browser window.
 * @param {EventEmitter} $eventBus Event emitter that implements event bus.
 * @param {ModuleApiProvider} $moduleApiProvider Module API provider
 * to refresh form dependents.
 * @constructor
 */
function FormSubmitter($moduleLoader, $window, $eventBus, $moduleApiProvider) {
	this._moduleLoader = $moduleLoader;
	this._window = $window;
	this._eventBus = $eventBus;
	this._apiProvider = $moduleApiProvider;
}

/**
 * Current module API provider.
 * @type {ModuleApiProvider}
 * @private
 */
FormSubmitter.prototype._apiProvider = null;

/**
 * Current module loader.
 * @type {ModuleLoader}
 * @private
 */
FormSubmitter.prototype._moduleLoader = null;

/**
 * Current event bus.
 * @type {EventEmitter}
 * @private
 */
FormSubmitter.prototype._eventBus = null;

/**
 * Current browser window.
 * @type {Window}
 * @private
 */
FormSubmitter.prototype._window = null;

/**
 * Submits form to module.
 * @param {jQuery} form jQuery form wrapper.
 * @returns {Promise} Promise for nothing.
 */
FormSubmitter.prototype.submit = function (form) {
	if (!this.canSubmit(form)) {
		return Promise.resolve();
	}

	var self = this,
		modulesByNames = this._moduleLoader.getModulesByNames(),
		name = form.attr(NAME_ATTRIBUTE_NAME),
		receiver = form.attr(DATA_MODULE_ATTRIBUTE_NAME),
		moduleReceiver = modulesByNames[receiver],
		submitValues = serializeFormToObject(form);

	if (!moduleReceiver || !moduleReceiver.implementation) {
		return Promise.resolve();
	}

	switchForm(form, true);

	var submitMethod = moduleHelper.getMethodToInvoke(
			moduleReceiver.implementation, 'submit', name
		),
		afterSubmitMethod = moduleHelper.getMethodToInvoke(
			moduleReceiver.implementation, 'afterSubmit', name
		),
		args = {
			element: form,
			name: name,
			moduleName: receiver,
			values: submitValues
		},
		submitPromise;

	try {
		submitPromise = Promise.resolve(submitMethod(args));
	} catch (e) {
		submitPromise = Promise.reject(e);
	}
	return submitPromise
		.then(function () {
			var dependents = getDataDependents(form, modulesByNames),
				promises = dependents.map(function (dependent) {
					return self._apiProvider.requestRefresh(
						dependent.moduleName, dependent.name
					);
				});

			return Promise.all(promises)
				.then(function () {
					switchForm(form, false);
					self._eventBus.emit('formSubmitted', args);

					var afterPromise;
					try {
						afterPromise = Promise.resolve(afterSubmitMethod(args));
					} catch (e) {
						afterPromise = Promise.reject(e);
					}
					return afterPromise;
				});
		}, function (reason) {
			switchForm(form, false);
			self._eventBus.emit('error', reason);
		});
};

/**
 * Determines an ability of specified form to be submitted to any module.
 * @param {jQuery} form jQuery form element wrapper.
 * @returns {boolean} True if form can be submitted.
 */
FormSubmitter.prototype.canSubmit = function (form) {
	var name = form.attr(NAME_ATTRIBUTE_NAME),
		modulesByNames = this._moduleLoader.getModulesByNames(),
		receiver = form.attr(DATA_MODULE_ATTRIBUTE_NAME);

	return Boolean(name) && Boolean(receiver) &&
		(receiver in modulesByNames);
};

/**
 * Serializes form to object.
 * @param {jQuery} form jQuery form wrapper.
 * @returns {Object} Serialized form object with input values.
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
 * @param {Object} modules A set of modules.
 * @returns {Array} List of placeholders that depend on form data.
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
			var moduleAndContext = moduleHelper
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
 * Switches all form inputs into disabled or enabled state.
 * @param {jQuery} form Form jQuery wrapper.
 * @param {boolean} isDisabled If it is true all form inputs will be disabled.
 */
function switchForm(form, isDisabled) {
	formInputs.forEach(function (elementName) {
		form.find(elementName).prop('disabled', isDisabled);
	});
}