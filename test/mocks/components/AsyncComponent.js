'use strict';

class AsyncComponent {
	render() {
		return new Promise(fulfill => setTimeout(() => fulfill(this.$context.name), 1));
	}
}

module.exports = AsyncComponent;
