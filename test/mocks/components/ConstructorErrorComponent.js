'use strict';

class ConstructorErrorComponent {
	constructor() {
		throw new Error(this.$context.name);
	}
}

module.exports = ConstructorErrorComponent;
