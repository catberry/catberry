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

var TITLE = 'Catberry@2.0.0 (' +
		'<a href="https://github.com/catberry/catberry/issues" ' +
		'target="_blank">' +
		'report an issue' +
		'</a>' +
		')',
	AMP = /&/g,
	LT = /</g,
	GT = />/g,
	QUOT = /\"/g,
	SINGLE_QUOT = /\'/g,
	ERROR_MESSAGE = /(error: )(.+)(\r?\n)/gi,
	ERROR_MESSAGE_REPLACEMENT = '<span style="color: red; font-size: 16pt;">' +
		'$1<span style="font-weight: bold;">$2</span>$3</span>',
	NEW_LINE = /\r?\n/g;

module.exports = {
	/**
	 * Prints error with formatting.
	 * @param {Error} error Error to print.
	 * @param {string} userAgent User agent information.
	 * @returns {string}
	 */
	prettyPrint: function (error, userAgent) {
		var message = error.stack
			.replace(AMP, '&amp;')
			.replace(LT, '&lt;')
			.replace(GT, '&gt;')
			.replace(QUOT, '&quot;')
			.replace(SINGLE_QUOT, '&#39;')
			.replace(ERROR_MESSAGE,
				(new Date()).toUTCString() + ';<br/>' +
				(userAgent ? (userAgent + ';<br/>') : '') +
				TITLE + '<br/><br/>' +
				ERROR_MESSAGE_REPLACEMENT)
			.replace(NEW_LINE, '<br/>');

		return '<div style="background-color: white; font-size: 12pt;">' +
			message + '</div>';
	}
};