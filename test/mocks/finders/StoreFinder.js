'use strict';

const events = require('events');
const testUtils = require('../../utils');

class StoreFinder extends events.EventEmitter {
	constructor(stores) {
		super();
		this._toFind = stores;
	}

	find() {
		return testUtils.wait(100).then(() => {
			this._found = this._toFind;
			return this._found;
		});
	}

	watch() { }
}

module.exports = StoreFinder;
