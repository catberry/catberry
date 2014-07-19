'use strict';

// This file contains definitions of rules how events from page are translated
// to "handle" methods of catberry's modules.
//
// Format:
// someHashOrDataEvent:parameter->eventName[module1,module2,module3]
//
// More details here:
// https://github.com/catberry/catberry/blob/master/docs/routing/event-route-definition.md

module.exports = [
	'show-details-:sha->details[commits]'
];