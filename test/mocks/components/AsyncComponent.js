'use strict';

const testUtils = require('../../utils');

class AsyncComponent {
	render() {
		return testUtils.wait(1).then(() => this.$context.name);
	}
}

module.exports = AsyncComponent;
