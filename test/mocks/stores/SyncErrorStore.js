'use strict';

class SyncErrorStore {
	load() {
		throw new Error(this.$context.name);
	}
}

module.exports = SyncErrorStore;
