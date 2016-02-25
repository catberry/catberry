'use strict';

const CatberryBase = require('./base/CatberryBase');

class Catberry extends CatberryBase {

	/**
	 * Creates new instance of the server-side Catberry.
	 * @constructor
	 * @extends CatberryBase
	 */
	constructor() {
		super();

		/**
		 * Current request router.
		 * @type {RequestRouter}
		 * @private
		 */
		this._router = null;
	}

	/**
	 * Gets connect/express middleware.
	 * @returns {Function} Middleware function.
	 */
	getMiddleware() {
		this._router = this.locator.resolve('requestRouter');
		return this._router.route.bind(this._router);
	}

	/**
	 * Builds browser bundle.
	 * @returns {Promise} Promise for nothing.
	 */
	build() {
		const builder = this.locator.resolve('browserBundleBuilder');
		return builder.build();
	}
}

module.exports = Catberry;
