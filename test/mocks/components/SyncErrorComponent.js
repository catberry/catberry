'use strict';

class SyncErrorComponent {
	render() {
		throw new Error(this.$context.name);
	}
}

module.exports = SyncErrorComponent;
