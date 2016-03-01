'use strict';

const testUtils = require('../../utils');

class AsyncErrorComponent {
	render() {
		return testUtils.wait(1).then(() => {
			throw new Error(this.$context.name);
		});
	}
}

module.exports = AsyncErrorComponent;
