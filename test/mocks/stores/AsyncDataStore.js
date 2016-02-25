'use strict';

class AsyncDataStore {
	load() {
		return new Promise(fulfill => setTimeout(() => fulfill(this.$context.name), 1));
	}
}

module.exports = AsyncDataStore;
