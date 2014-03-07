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

module.exports = TemplateTransform;

var util = require('util'),
	ModuleReadable = require('./ModuleReadable'),
	trumpet = require('trumpet');

/**
 * Creates new instance of template recursive stream transformation.
 * @param {Object} parameters Set of request parameters.
 * @param {Object} modulesByNames Map of modules by names.
 * @param {Array<string>} placeholderIds Element ids of all placeholders.
 * @param {Object} placeholdersByIds Map of placeholders by ids.
 * @returns {stream.Transform}
 * @constructor
 */
function TemplateTransform(parameters, modulesByNames, placeholderIds,
	placeholdersByIds) {

	var trumpetInstance = trumpet();

	placeholderIds.forEach(function (id) {
		var placeholder = placeholdersByIds[id],
			moduleName = placeholder.moduleName,
			module = modulesByNames[moduleName];

		var elementStream = trumpetInstance
			.select(id)
			.createWriteStream();

		elementStream.once('drain', function () {
			var moduleStream = new ModuleReadable(module,
					placeholder, parameters),
				innerTransform = new TemplateTransform(parameters,
					modulesByNames, placeholderIds, placeholdersByIds);
			moduleStream
				.pipe(innerTransform)
				.pipe(elementStream);
		});
	});

	return trumpetInstance;
}