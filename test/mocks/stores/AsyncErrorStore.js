'use strict';

const testUtils = require('../../utils');

class AsyncErrorStore {
	load() {
		return testUtils.wait(1).then(() => {
			throw new Error(this.$context.name);
		});
	}
}

module.exports = AsyncErrorStore;
