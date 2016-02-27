'use strict';

const events = require('events');

class StoreFinder extends events.EventEmitter {
	constructor(stores) {
		super();
		this._toFind = stores;
	}

	find() {
		return new Promise(fulfill => setTimeout(() => {
			this._found = this._toFind;
			fulfill(this._found);
		}, 100));
	}

	watch() { }
}

module.exports = StoreFinder;
