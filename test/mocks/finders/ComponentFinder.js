'use strict';

const events = require('events');
const testUtils = require('../../utils');

class ComponentFinder extends events.EventEmitter {
	constructor(components) {
		super();
		this._toFind = components;
	}

	find() {
		return testUtils.wait(100).then(() => {
			this._found = this._toFind;
			return this._found;
		});
	}

	watch() { }
}

module.exports = ComponentFinder;
