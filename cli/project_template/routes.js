'use strict';

// This file contains definitions of rules how location URLs are translated
// to "render" methods of catberry's modules.
//
// Format:
// /some/:parameter[module1,module2,module3]
//
// More details here:
// https://github.com/pragmadash/catberry/blob/master/docs/routing/url-route-definition.md

module.exports = [
	'/:page[main, pages]',
	'/:page[main, pages]?query=:query[search]'
];