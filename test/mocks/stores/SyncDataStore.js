'use strict';

class SyncDataStore {
	load() {
		return this.$context.name;
	}
}

module.exports = SyncDataStore;
