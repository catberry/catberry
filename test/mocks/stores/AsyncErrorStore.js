'use strict';

class AsyncErrorStore {
	load() {
		return new Promise((fulfill, reject) =>
			setTimeout(() => reject(new Error(this.$context.name)), 1));
	}
}

module.exports = AsyncErrorStore;
