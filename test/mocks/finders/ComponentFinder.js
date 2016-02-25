'use strict';

const events = require('events');

class ComponentFinder extends events.EventEmitter {
	constructor(components) {
		super();
		this._toFind = components;
	}

	find() {
		return new Promise(fulfill => setTimeout(() => {
			this._found = this._toFind;
			fulfill(this._found);
		}, 100));
	}

	watch() { }
}

module.exports = ComponentFinder;
