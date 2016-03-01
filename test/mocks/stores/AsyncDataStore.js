'use strict';

const testUtils = require('../../utils');

class AsyncDataStore {
	load() {
		return testUtils.wait(1).then(() => this.$context.name);
	}
}

module.exports = AsyncDataStore;
