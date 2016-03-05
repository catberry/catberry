'use strict';

const	events = require('events');

class UniversalMock extends events.EventEmitter {
	constructor(methodNames) {
		super();
		this.setMaxListeners(0);

		methodNames.forEach(name => {
			this[name] = function() {
				this.emit(name, arguments);
				return Promise.resolve();
			};
		});
	}

	decorateMethod(name, method) {
		const old = this[name];
		if (typeof (old) !== 'function') {
			return;
		}
		this[name] = function() {
			old.apply(this, arguments);
			return method.apply(this, arguments);
		};
	}
}

module.exports = UniversalMock;
