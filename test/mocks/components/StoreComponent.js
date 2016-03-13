'use strict';

class StoreComponent {
	render() {
		return this.$context.getStoreData();
	}
}

module.exports = StoreComponent;
