'use strict';

const helper = {
	COMPONENT_PREFIX: 'cat-',
	COMPONENT_PREFIX_REGEXP: /^cat-/i,
	COMPONENT_ERROR_TEMPLATE_POSTFIX: '--error',
	DOCUMENT_COMPONENT_NAME: 'document',
	DOCUMENT_ELEMENT_NAME: 'html',
	HEAD_COMPONENT_NAME: 'head',
	ATTRIBUTE_ID: 'id',
	ATTRIBUTE_STORE: 'cat-store',
	DEFAULT_LOGIC_FILENAME: 'index.js',

	/**
	 * Creates a name for the error template of the component.
	 * @param {string} componentName The name of the component.
	 * @returns {string} The name of the error template of the component.
	 */
	getNameForErrorTemplate: componentName => {
		if (typeof (componentName) !== 'string') {
			return '';
		}
		return componentName + helper.COMPONENT_ERROR_TEMPLATE_POSTFIX;
	},

	/**
	 * Determines if the specified component name is a "document" component's name.
	 * @param {string} componentName The name of the component.
	 * @returns {boolean} True if the specified component's name
	 * is a "document" component's name.
	 */
	isDocumentComponent: componentName =>
		componentName.toLowerCase() === helper.DOCUMENT_COMPONENT_NAME,

	/**
	 * Determines if the specified component name is a "head" component name.
	 * @param {string} componentName The name of the component.
	 * @returns {boolean} True if the specified component's name
	 * is a "head" component's name.
	 */
	isHeadComponent: componentName =>
		componentName.toLowerCase() === helper.HEAD_COMPONENT_NAME,

	/**
	 * Gets a original component's name without a prefix.
	 * @param {string} fullComponentName The full component's name (tag name).
	 * @returns {string} The original component's name without a prefix.
	 */
	getOriginalComponentName: fullComponentName => {
		if (typeof (fullComponentName) !== 'string') {
			return '';
		}
		fullComponentName = fullComponentName.toLowerCase();
		if (fullComponentName === helper.HEAD_COMPONENT_NAME) {
			return fullComponentName;
		}
		if (fullComponentName === helper.DOCUMENT_COMPONENT_NAME ||
			fullComponentName === helper.DOCUMENT_ELEMENT_NAME) {
			return helper.DOCUMENT_COMPONENT_NAME;
		}
		return fullComponentName.replace(helper.COMPONENT_PREFIX_REGEXP, '');
	},

	/**
	 * Gets a valid tag name for a component.
	 * @param {string} componentName The name of the component.
	 * @returns {string} The name of the tag.
	 */
	getTagNameForComponentName: componentName => {
		if (typeof (componentName) !== 'string') {
			return '';
		}
		const upperComponentName = componentName.toUpperCase();
		if (componentName === helper.HEAD_COMPONENT_NAME) {
			return upperComponentName;
		}
		if (componentName === helper.DOCUMENT_COMPONENT_NAME) {
			return helper.DOCUMENT_ELEMENT_NAME.toUpperCase();
		}
		return helper.COMPONENT_PREFIX.toUpperCase() + upperComponentName;
	},

	/**
	 * Gets a prefixed method of the module that can be invoked.
	 * @param {Object} module The module implementation.
	 * @param {string} prefix The method prefix (i.e. handle).
	 * @param {string?} name The name of the entity to invoke method for
	 * (will be converted to a camel case).
	 * @returns {Function} The method to invoke.
	 */
	getMethodToInvoke: (module, prefix, name) => {
		if (!module || typeof (module) !== 'object') {
			return defaultPromiseMethod;
		}
		const methodName = helper.getCamelCaseName(prefix, name);
		if (typeof (module[methodName]) === 'function') {
			return module[methodName].bind(module);
		}
		if (typeof (module[prefix]) === 'function') {
			return module[prefix].bind(module, name);
		}

		return defaultPromiseMethod;
	},

	/**
	 * Gets a name in the camel case for anything.
	 * @param {string} prefix The prefix for the name.
	 * @param {string} name The name to convert.
	 * @returns {string} Name in the camel case.
	 */
	getCamelCaseName: (prefix, name) => {
		if (!name) {
			return '';
		}
		if (prefix) {
			name = `${prefix}-${name}`;
		}
		return name
			.replace(/(?:[^a-z0-9]+)(\w)/gi, (space, letter) => letter.toUpperCase())
			.replace(/(^[^a-z0-9])|([^a-z0-9]$)/gi, '');
	},

	/**
	 * Gets a safe promise resolved by the action.
	 * @param {Function} action The action to wrap with a safe promise.
	 * @returns {Promise} The promise for the done action.
	 */
	getSafePromise: action => {
		try {
			return Promise.resolve(action());
		} catch (e) {
			return Promise.reject(e);
		}
	}
};

/**
 * Just returns a resolved promise.
 * @returns {Promise} The promise for nothing.
 */
function defaultPromiseMethod() {
	return Promise.resolve();
}

module.exports = helper;
