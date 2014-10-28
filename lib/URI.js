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
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = URI;

var punycode = require('punycode');

// https://tools.ietf.org/html/rfc3986#appendix-B
var AUTHORITY_PARSE_REGEXP = /^(?:([^@]+)@)?([^:]*)(?::([0-9]+))?$/,
	URI_PARSE_REGEXP = new RegExp(
		'^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?'
	),
	ERROR_BASE_SCHEME = 'Scheme component is required to be present ' +
		'in a base URI';

/**
 * Creates new instance of URI according to RFC 3986.
 * @param {String} uriString URI string to parse components.
 * @constructor
 */
function URI(uriString) {
	if (typeof(uriString) !== 'string') {
		uriString = '';
	}

	uriString = decodeURI(uriString);
	// https://tools.ietf.org/html/rfc3986#appendix-B
	var matches = uriString.match(URI_PARSE_REGEXP);

	this.scheme = matches[2];
	this.authority = matches[4];

	if (typeof(this.authority) === 'string') {
		var authorityComponents = this.getAuthorityComponents();
		if (authorityComponents.host) {
			authorityComponents.host = punycode.toUnicode(authorityComponents.host);
		}
		this.setAuthorityComponents(authorityComponents);
	}

	this.path = matches[5];
	this.query = matches[7];
	this.fragment = matches[9];
}

/**
 * Current URI scheme.
 * https://tools.ietf.org/html/rfc3986#section-3.1
 * @type {string}
 */
URI.prototype.scheme = '';

/**
 * Current URI authority.
 * https://tools.ietf.org/html/rfc3986#section-3.2
 * @type {string}
 */
URI.prototype.authority = '';

/**
 * Current URI path.
 * https://tools.ietf.org/html/rfc3986#section-3.3
 * @type {string}
 */
URI.prototype.path = '';

/**
 * Current URI query.
 * https://tools.ietf.org/html/rfc3986#section-3.4
 * @type {string}
 */
URI.prototype.query = '';

/**
 * Current URI fragment.
 * https://tools.ietf.org/html/rfc3986#section-3.5
 * @type {string}
 */
URI.prototype.fragment = '';

/**
 * Converts a URI reference that might be relative to a given base URI
 * into the reference's target URI.
 * https://tools.ietf.org/html/rfc3986#section-5.2
 * @param {URI} baseUri Base URI.
 * @returns {URI} Resolved URI.
 */
URI.prototype.resolveRelative = function (baseUri) {
	if (!baseUri.scheme) {
		throw new Error(ERROR_BASE_SCHEME);
	}

	return transformReference(baseUri, this);
};

/**
 * Gets authority components such as user information, host and port.
 * @returns {{userInfo: string, host: string, port: string}}
 */
URI.prototype.getAuthorityComponents = function () {
	if (typeof(this.authority) !== 'string') {
		return null;
	}
	var match = this.authority.match(AUTHORITY_PARSE_REGEXP);
	if (!match) {
		return null;
	}
	return {
		userInfo: match[1],
		host: match[2],
		port: match[3]
	};
};

/**
 * Sets authority components from object.
 * @param {Object} components Authority components object.
 * @param {String} components.userInfo The userinfo subcomponent.
 * https://tools.ietf.org/html/rfc3986#section-3.2.1
 * @param {String} components.host The host subcomponent of authority.
 * https://tools.ietf.org/html/rfc3986#section-3.2.2
 * @param {String} components.port The port subcomponent of authority.
 * https://tools.ietf.org/html/rfc3986#section-3.2.3
 */
URI.prototype.setAuthorityComponents = function (components) {
	if (!components) {
		this.authority = '';
	}

	this.authority = recombineAuthority(components);
};

/**
 * Gets query object from query component.
 * @returns {Object} Dictionary with key and values of query.
 */
URI.prototype.getQueryValues = function () {
	var result = {};
	if (!this.query) {
		return result;
	}

	this.query
		.split('&')
		.forEach(function (pair) {
			var parts = pair.split('='),
				key = decodeURIComponent(parts[0]);
			result[key] = decodeURIComponent(parts[1]);
		});

	return result;
};

/**
 * Recomposes query component of URI from object.
 * @param {Object} queryObject URI query.
 * @returns {String} URI query string.
 */
URI.prototype.setQueryValues = function (queryObject) {
	this.query = Object.keys(queryObject)
		.map(function (key) {
			return encodeURIComponent(key) + '=' +
				encodeURIComponent(queryObject[key]);
		})
		.join('&');
};

/**
 * Recomposes URI components to URI string,
 * https://tools.ietf.org/html/rfc3986#section-5.3
 * @returns {string} URI string.
 */
URI.prototype.toString = function () {
	var result = '';

	if (typeof(this.scheme) === 'string') {
		result += this.scheme + ':';
	}

	if (typeof(this.authority) === 'string') {
		var authority = this.authority,
			authorityDetails = this.getAuthorityComponents();
		if (authorityDetails.host) {
			authorityDetails.host = punycode.toASCII(authorityDetails.host);
			authority = recombineAuthority(authorityDetails);
		}
		result += '//' + authority;
	}

	result += String(this.path || '');

	if (typeof(this.query) === 'string') {
		result += '?' + this.query;
	}

	if (typeof(this.fragment) === 'string') {
		result += '#' + this.fragment;
	}

	return fixedEncodeURI(result);
};

/**
 * Transforms reference for relative resolution.
 * https://tools.ietf.org/html/rfc3986#section-5.2.2
 * @param {URI} baseComponents Components of base URI.
 * @param {URI} referenceComponents Components of reference URI.
 * @returns {URI} Components of target URI.
 */
/*jshint maxdepth:false */
function transformReference(baseUri, referenceUri) {
	var targetUri = new URI('');

	if (referenceUri.scheme) {
		targetUri.scheme = referenceUri.scheme;
		targetUri.authority = referenceUri.authority;
		targetUri.path = removeDotSegments(referenceUri.path);
		targetUri.query = referenceUri.query;
	} else {
		if (referenceUri.authority) {
			targetUri.authority = referenceUri.authority;
			targetUri.path = removeDotSegments(referenceUri.path);
			targetUri.query = referenceUri.query;
		} else {
			if (referenceUri.path === '') {
				targetUri.path = baseUri.path;
				if (referenceUri.query) {
					targetUri.query = referenceUri.query;
				} else {
					targetUri.query = baseUri.query;
				}
			} else {
				if (referenceUri.path[0] === '/') {
					targetUri.path =
						removeDotSegments(referenceUri.path);
				} else {
					targetUri.path =
						merge(baseUri, referenceUri);
					targetUri.path =
						removeDotSegments(targetUri.path);
				}
				targetUri.query = referenceUri.query;
			}
			targetUri.authority = baseUri.authority;
		}
		targetUri.scheme = baseUri.scheme;
	}

	targetUri.fragment = referenceUri.fragment;
	return targetUri;
}

/**
 * Merges a relative-path reference with the path of the base URI.
 * https://tools.ietf.org/html/rfc3986#section-5.2.3
 * @param {URI} baseUri Components of base URI.
 * @param {URI} referenceUri Components of reference URI.
 * @returns {String} Merged path.
 */
function merge(baseUri, referenceUri) {
	if (baseUri.authority && !baseUri.path) {
		return '/' + referenceUri.path;
	}

	var segmentsString = baseUri.path.indexOf('/') !== -1 ?
		baseUri.path.replace(/\/[^\/]+$/, '/') : '';

	return segmentsString + referenceUri.path;
}

/**
 * Removes dots segments from URI path.
 * https://tools.ietf.org/html/rfc3986#section-5.2.4
 * @param {String} uriPath URI path with possible dot segments.
 * @returns {String} URI path without dot segments.
 */
function removeDotSegments(uriPath) {
	if (!uriPath) {
		return '';
	}

	var inputBuffer = uriPath,
		newBuffer = '',
		nextSegment = '',
		outputBuffer = '';

	while (inputBuffer.length !== 0) {

		// If the input buffer begins with a prefix of "../" or "./",
		// then remove that prefix from the input buffer
		newBuffer = inputBuffer.replace(/^\.?\.\//, '');
		if (newBuffer !== inputBuffer) {
			inputBuffer = newBuffer;
			continue;
		}

		// if the input buffer begins with a prefix of "/./" or "/.",
		// where "." is a complete path segment, then replace that
		// prefix with "/" in the input buffer
		newBuffer = inputBuffer.replace(/^((\/\.\/)|(\/\.$))/, '/');
		if (newBuffer !== inputBuffer) {
			inputBuffer = newBuffer;
			continue;
		}

		// if the input buffer begins with a prefix of "/../" or "/..",
		// where ".." is a complete path segment, then replace that
		// prefix with "/" in the input buffer and remove the last
		// segment and its preceding "/" (if any) from the output
		// buffer
		newBuffer = inputBuffer.replace(/^((\/\.\.\/)|(\/\.\.$))/, '/');
		if (newBuffer !== inputBuffer) {
			outputBuffer = outputBuffer.replace(/\/[^\/]+$/, '');
			inputBuffer = newBuffer;
			continue;
		}

		// if the input buffer consists only of "." or "..", then remove
		// that from the input buffer
		if (inputBuffer === '.' || inputBuffer === '..') {
			break;
		}

		// move the first path segment in the input buffer to the end of
		// the output buffer, including the initial "/" character (if
		// any) and any subsequent characters up to, but not including,
		// the next "/" character or the end of the input buffer
		nextSegment = /^\/?[^\/]*(\/|$)/.exec(inputBuffer)[0];
		nextSegment = nextSegment.replace(/([^\/])(\/$)/, '$1');
		inputBuffer = inputBuffer.substring(nextSegment.length);
		outputBuffer += nextSegment;
	}

	return outputBuffer;
}

/**
 * Fixed version of encodeURI function according RFC 3986
 * https://developer.mozilla.org
 * /en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURI.
 * @param {String} string String to encode.
 * @returns {string} Encoded string.
 */
function fixedEncodeURI(string) {
	return encodeURI(string)
		.replace(/%5B/g, '[')
		.replace(/%5D/g, ']');
}

/**
 * Recombine authority components from object.
 * @param {Object} components Authority components object.
 * @param {String} components.userInfo The userinfo subcomponent.
 * https://tools.ietf.org/html/rfc3986#section-3.2.1
 * @param {String} components.host The host subcomponent of authority.
 * https://tools.ietf.org/html/rfc3986#section-3.2.2
 * @param {String} components.port The port subcomponent of authority.
 * https://tools.ietf.org/html/rfc3986#section-3.2.3
 * @returns {String} Authority components of URI.
 */
function recombineAuthority (components) {
	var result = '';
	if (typeof(components.userInfo) === 'string') {
		result += components.userInfo + '@';
	}
	if (typeof(components.host) === 'string') {
		result += components.host;
	}
	if (typeof(components.port) === 'string') {
		result += ':' + components.port;
	}
	return result;
}