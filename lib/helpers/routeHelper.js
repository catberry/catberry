'use strict';

const PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/;
const REG_EXP_ESCAPE = /[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/;

module.exports = {

	/**
	 * Removes a slash from the end of the URI path.
	 * @param {string} uriPath The URI path.
	 * @returns {string} The URI without a slash at the end.
	 */
	removeEndSlash(uriPath) {
		if (!uriPath || typeof (uriPath) !== 'string') {
			return '';
		}
		if (uriPath === '/') {
			return uriPath;
		}
		return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
	},

	/**
	 * Builds a regular expression for matching the actual URL parts
	 * @param {string} expression Routing expression.
	 * @param {Array} parameters List of extracted parameters.
	 * @param {string} substitute Regular expression source for the
	 * substitute of the parameter's value.
	 * @returns {RegExp} Regular expression source.
	 */
	buildMatcher(expression, parameters, substitute) {
		let regExpSource = '^';
		let nextParameterIndex = 0;
		let nextParameter = parameters[nextParameterIndex];

		for (let i = 0; i < expression.length; i++) {

			if (nextParameter && i === nextParameter.start) {
				while (++i < nextParameter.end - 1) {
					// just skipping the parameter in the expression string
				}
				nextParameterIndex++;
				nextParameter = parameters[nextParameterIndex];
				regExpSource += substitute;
				continue;
			}

			const current = expression[i];

			if (REG_EXP_ESCAPE.test(current)) {
				regExpSource += `\\${current}`;
				continue;
			}

			regExpSource += current;
		}

		regExpSource += '$';
		return new RegExp(regExpSource, 'i');
	},

	/**
	 * Creates a new parameter descriptor.
	 * @returns {{start: number, end: number, name: null, stores: {}}}
	 */
	createParameterDescriptor() {
		return {
			start: -1,
			end: -1,
			name: null,
			stores: Object.create(null)
		};
	},

	/**
	 * Creates a function that extracts parameters from the URI.
	 * @param {Object} routeDescriptor Route descriptor.
	 * @returns {function} Function
	 * @private
	 */
	createParameterExtractor(routeDescriptor) {
		return uri => {
			const pathMatches = uri.path.match(routeDescriptor.pathRegExp);
			if (!pathMatches) {
				return null;
			}

			const state = Object.create(null);
			const pathParameterValues = pathMatches.slice(1);

			setStateValues(state, pathParameterValues, routeDescriptor.pathParameters);

			if (uri.query && uri.query.values) {
				setQueryParameters(state, uri.query.values, routeDescriptor);
			}

			return state;
		};
	}
};

/**
 * Sets parameter values to the state using parameter and store names.
 * @param {Object} state Current state object.
 * @param {Array} values Current values.
 * @param {Array} parameters List of parameter descriptors.
 */
function setStateValues(state, values, parameters) {
	values.forEach((value, index) => {
		const parameter = parameters[index];
		parameter.stores.forEach(storeName => {
			if (!(storeName in state)) {
				state[storeName] = Object.create(null);
			}

			// if URI has several values for the same parameter it turns to an array
			if (parameter.name in state[storeName]) {
				if (Array.isArray(state[storeName][parameter.name])) {
					state[storeName][parameter.name].push(value);
				} else {
					state[storeName][parameter.name] = [state[storeName][parameter.name], value];
				}
			} else {
				state[storeName][parameter.name] = value;
			}
		});
	});
}

/**
 * Sets query parameters to the state.
 * @param {Object} state Current state object.
 * @param {Object} queryValues URI query parameters.
 * @param {Object} routeDescriptor Current route descriptor.
 */
function setQueryParameters(state, queryValues, routeDescriptor) {
	Object.keys(queryValues)
		.forEach(name => {
			const value = queryValues[name];

			if (Array.isArray(value)) {
				value.forEach(item => {
					const subValues = Object.create(null);
					subValues[name] = item;
					setQueryParameters(state, subValues, routeDescriptor);
				});
				return;
			}
			const isValue = typeof (value) === 'string';

			let queryNameMatches = null;
			let queryValueMatches = null;
			let routeParameter = null;

			routeDescriptor.queryParameters.some(parameter => {
				queryNameMatches = name.match(parameter.nameRegExp);

				if (isValue && parameter.valueRegExp) {
					queryValueMatches = value.match(parameter.valueRegExp);
				}

				if (queryNameMatches) {
					routeParameter = parameter;
					return true;
				}
				return false;
			});

			if (!routeParameter) {
				return;
			}

			setStateValues(state, queryNameMatches.slice(1), routeParameter.nameParameters);

			if (!queryValueMatches) {
				return;
			}
			setStateValues(state, queryValueMatches.slice(1), routeParameter.valueParameters);
		});
}
