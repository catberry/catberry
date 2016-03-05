'use strict';

const URI_PATH_REPLACEMENT_REG_EXP_SOURCE = '([^\\/\\\\]*)';
const URI_QUERY_REPLACEMENT_REG_EXP_SOURCE = '([^&?=]*)';

const PATH_END_SLASH_REG_EXP = /(.+)\/($|\?|#)/;
const EXPRESSION_ESCAPE_REG_EXP = /[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g;
const IDENTIFIER_REG_EXP_SOURCE = '[$A-Z_][\\dA-Z_$]*';
const STORE_LIST_REG_EXP_SOURCE = '(?:(?:\\\\[[ ]*' +
		'[^\\[\\],]+' +
		'([ ]*,[ ]*' +
		'[^\\[\\],]+' +
		')*[ ]*\\\\])|(?:\\\\[[ ]*\\\\]))?';
const PARAMETER_REG_EXP = new RegExp(
	`:${IDENTIFIER_REG_EXP_SOURCE}${STORE_LIST_REG_EXP_SOURCE}`, 'gi'
);
const SLASHED_BRACKETS_REG_EXP = /\\\[|\\\]/;
const STORE_LIST_SEPARATOR = ',';

module.exports = {

	/**
	 * Removes a slash from the end of the URI path.
	 * @param {string} uriPath The URI path.
	 * @returns {string} The URI without a slash at the end.
	 */
	removeEndSlash: uriPath => {
		if (!uriPath || typeof (uriPath) !== 'string') {
			return '';
		}
		if (uriPath === '/') {
			return uriPath;
		}
		return uriPath.replace(PATH_END_SLASH_REG_EXP, '$1$2');
	},

	/**
	 * Gets a URI mapper from the a route expression like:
	 * /some/:id[store1, store2, store3]/details?filter=:filter[store3].
	 * @param {URI} routeUri The expression that defines a route.
	 * @returns {{expression: RegExp, map: Function}|null} The URI mapper object.
	 */
	compileRoute: routeUri => {
		if (!routeUri) {
			return null;
		}

		// escape regular expression characters
		const escaped = routeUri.path.replace(
			EXPRESSION_ESCAPE_REG_EXP, '\\$&'
		);

		// get all occurrences of routing parameters in URI path
		const regExpSource = `^${escaped.replace(PARAMETER_REG_EXP, URI_PATH_REPLACEMENT_REG_EXP_SOURCE)}$`;
		const expression = new RegExp(regExpSource, 'i');
		const pathParameterMatches = escaped.match(PARAMETER_REG_EXP);
		const pathParameters = pathParameterMatches ?
			pathParameterMatches.map(getParameterDescriptor) :
			null;

		var queryMapper, pathMapper;

		if (pathParameters) {
			pathMapper = createUriPathMapper(expression, pathParameters);
		}

		if (routeUri.query) {
			const queryParameters = Object.create(null);

			Object.keys(routeUri.query.values)
				.forEach(name => {
					// arrays in routing definitions are not supported
					if (Array.isArray(routeUri.query.values[name])) {
						return;
					}

					// escape regular expression characters
					const escaped = routeUri.query.values[name]
						.replace(EXPRESSION_ESCAPE_REG_EXP, '\\$&');

					// get all occurrences of routing parameters in URI path
					const regExpSource = `^${escaped.replace(PARAMETER_REG_EXP, URI_QUERY_REPLACEMENT_REG_EXP_SOURCE)}$`;
					const queryParameterMatches = escaped.match(PARAMETER_REG_EXP);
					if (!queryParameterMatches || queryParameterMatches.length === 0) {
						return;
					}

					const parameter = getParameterDescriptor(
						queryParameterMatches[queryParameterMatches.length - 1]
					);
					const expression = new RegExp(regExpSource, 'i');
					parameter.map = createUriQueryValueMapper(expression);
					queryParameters[name] = parameter;
				});
			queryMapper = createUriQueryMapper(queryParameters);
		}

		return {
			expression,
			map: uri => {
				const state = Object.create(null);
				if (pathMapper) {
					pathMapper(uri.path, state);
				}

				if (queryMapper && uri.query) {
					queryMapper(uri.query.values, state);
				}

				return state;
			}
		};
	}
};

/**
 * Creates a new URI path-to-state object mapper.
 * @param {RegExp} expression The regular expression to match URI path.
 * @param {Array} parameters The list of parameter descriptors.
 * @returns {Function} The URI mapper function.
 */
function createUriPathMapper(expression, parameters) {
	return (uriPath, state) => {
		var matches = uriPath.match(expression);
		if (!matches || matches.length < 2) {
			return state;
		}

		// start with second match because first match is always
		// the whole URI path
		matches = matches.splice(1);

		parameters.forEach((parameter, index) => {
			var value = matches[index];
			try {
				value = decodeURIComponent(value);
			} catch (e) {
				// nothing to do
			}
			parameter.storeNames.forEach(storeName => {
				if (!(storeName in state)) {
					state[storeName] = Object.create(null);
				}
				state[storeName][parameter.name] = value;
			});
		});

		return state;
	};
}

/**
 * Creates a new URI query-to-state object mapper.
 * @param {Map} parameters The Map of possible query parameter
 * descriptors by their names.
 * @returns {Function} URI mapper function.
 */
function createUriQueryMapper(parameters) {
	return (queryValues, state) => {
		queryValues = queryValues || Object.create(null);

		Object.keys(queryValues)
			.forEach(queryKey => {
				const parameter = parameters[queryKey];
				if (!parameter) {
					return;
				}

				const value = Array.isArray(queryValues[queryKey]) ?
					queryValues[queryKey]
						.map(parameter.map)
						.filter(value => value !== null) :
					parameter.map(queryValues[queryKey]);

				if (value === null) {
					return;
				}
				parameter.storeNames.forEach(storeName => {
					if (state[storeName] === null ||
						typeof (state[storeName]) !== 'object') {
						state[storeName] = Object.create(null);
					}
					state[storeName][parameter.name] = value;
				});
			});
	};
}

/**
 * Maps a query parameter's value using the parameters expression.
 * @param {RegExp} expression The regular expression to get a parameter value.
 * @returns {Function} The function for mapping the query string parameter's value.
 */
function createUriQueryValueMapper(expression) {
	return value => {
		value = value
			.toString()
			// we have to temporary encode these characters for not breaking
			// expression parsing, because it's terminated by query separator
			.replace(/=/g, '%3D')
			.replace(/\?/g, '%3F')
			.replace(/&/g, '%26');

		const matches = value.match(expression);
		if (!matches || matches.length === 0) {
			return null;
		}

		// the value is the second item, the first is a whole string
		var mappedValue = matches[matches.length - 1];
		try {
			mappedValue = decodeURIComponent(mappedValue);
		} catch (e) {
			// nothing to do
		}

		return mappedValue;
	};
}

/**
 * Gets description for a parameter from its expression.
 * @param {string} parameter The parameter expression.
 * @returns {{name: string, storeNames: Array}} The parameter descriptor.
 */
function getParameterDescriptor(parameter) {
	const parts = parameter.split(SLASHED_BRACKETS_REG_EXP);

	return {
		name: parts[0]
			.trim()
			.substring(1),
		storeNames: (parts[1] ? parts[1] : '')
			.split(STORE_LIST_SEPARATOR)
			.map(storeName => storeName.trim())
			.filter(storeName => storeName.length > 0)
	};
}
