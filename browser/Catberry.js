'use strict';

const CatberryBase = require('../lib/base/CatberryBase');

const Promise = require('promise');
// if browser still does not have promises then add it.
if (!('Promise' in window)) {
	window.Promise = Promise;
}

class Catberry extends CatberryBase {

	/**
	 * Creates new instance of the browser version of Catberry.
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
	 * Wraps current HTML document with Catberry event handlers.
	 */
	wrapDocument() {
		this._router = this.locator.resolve('requestRouter');
	}

	/**
	 * Starts Catberry application when DOM is ready.
	 * @returns {Promise} Promise for nothing.
	 */
	startWhenReady() {
		if (window.catberry) {
			return Promise.resolve();
		}

		return new Promise((fulfill, reject) => {
			window.document.addEventListener('DOMContentLoaded', () => {
				try {
					this.wrapDocument();
					window.catberry = this;
					fulfill();
				} catch (e) {
					reject(e);
				}
			});
		});
	}
}

module.exports = Catberry;
