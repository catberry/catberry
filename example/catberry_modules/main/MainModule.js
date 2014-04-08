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

module.exports = MainModule;

var util = require('util');

var ERROR_RENDER_NOT_FOUND =
	'This module does not have method to render placeholder "%s"';

// these all arguments are injected in constructor
// $-prefixed arguments are instances of type registrations in ServiceLocator.
// Other arguments are values from config object.
/**
 * Create new instance of main application module.
 * @param {Logger} $logger To log some messages.
 * @param {config} $config Config object.
 * @param {UHR} $uhr Universal HTTP(S) request.
 * @constructor
 */
function MainModule($logger, $config, $uhr) {
	this._logger = $logger;
	this._title = $config.title;
	this._helloMessage = $config.helloMessage;
	this._uhr = $uhr;
	this._staticUrl = 'http://' + $config.staticHost + ':' +
		$config.staticPort + '/' + 'main';
}

/**
 * Current URL to host with static content.
 * @type {string}
 * @private
 */
MainModule.prototype._staticUrl = null;

/**
 * Current Universal HTTP(S) Request.
 * @type {UHR}
 * @private
 */
MainModule.prototype._uhr = null;

/**
 * Current instance of logger.
 * @type {Logger}
 * @private
 */
MainModule.prototype._logger = null;

/**
 * Current main page title.
 * @type {string}
 * @private
 */
MainModule.prototype._title = 'Default title';

/**
 * Current hello message on top of main page.
 * @type {string}
 * @private
 */
MainModule.prototype._helloMessage = 'Default hello message';

// following method works on both server-side and client-side
// need to remember do not use environment-specified code here.
/**
 * Renders all specified placeholders by name.
 * @param {string} placeholderName Name of placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
MainModule.prototype.render = function (placeholderName, args, callback) {
	// we could easy route render requests to other methods like this.
	var renderName = placeholderName + 'Render';

	if (!(renderName in this)) {
		var error = new Error(
			util.format(ERROR_RENDER_NOT_FOUND, placeholderName));
		callback(error);
		return;
	}

	this[renderName](args, callback);
};

// methods "handle" and "submit" are executed only on client-side in browser
// usage of browser-specified methods is safe
/**
 * Handles all events (location hash changes) on page.
 * @param {string} eventName Event name "hash"
 * or "!hash" if hash changes to another one.
 * @param {Function} callback Callback on finish.
 */
MainModule.prototype.handle = function (eventName, callback) {
	callback();
};

/**
 * Submits data to module from HTML forms on page.
 * @param {string} formName Name of form.
 * @param {Object} formObject Object where keys are input names.
 * @param {Function} callback Callback on finish.
 */
MainModule.prototype.submit = function (formName, formObject, callback) {
	callback();
};

/**
 * Renders body placeholder template.
 * @param {Object} args State arguments.
 * @param {Function} callback Callback on finish.
 */
MainModule.prototype.bodyRender = function (args, callback) {
	if (!args.tab) {
		callback(null, {tutorial: true});
		return;
	}

	var data = {};
	data[args.tab] = true;
	callback(null, data);
};

/**
 * Renders tutorial page.
 * @param {Object} args State arguments.
 * @param {Function} callback Callback on finish.
 */
MainModule.prototype.tutorialRender = function (args, callback) {
	this._uhr.get(this._staticUrl + '/tutorial.html', {},
		function (error, status, data) {
			if (error) {
				callback(error);
				return;
			}

			callback(null, {page: data});
		});
};

/**
 * Renders about page
 * @param {Object} args State arguments.
 * @param {Function} callback Callback on finish.
 */
MainModule.prototype.aboutRender = function (args, callback) {
	this._uhr.get(this._staticUrl + '/about.html', {},
		function (error, status, data) {
			if (error) {
				callback(error);
				return;
			}

			callback(null, {page: data});
		});
};

/**
 * Renders main placeholder template is called __index.
 * @param {Object} args State arguments.
 * @param {Function} callback Callback on finish.
 * @private
 */
MainModule.prototype.__indexRender = function (args, callback) {
	callback(null, {
		title: this._title,
		helloMessage: this._helloMessage
	});
};