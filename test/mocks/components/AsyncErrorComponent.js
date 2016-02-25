'use strict';

class AsyncErrorComponent {
	render() {
		return new Promise((fulfill, reject) =>
			setTimeout(() => reject(new Error(this.$context.name)), 1));
	}
}

module.exports = AsyncErrorComponent;
