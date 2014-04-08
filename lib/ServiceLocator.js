/* 
 * catberry
 *
 * Copyright (c) 2014 Denis Rechkunov and project contributors.
 *
 * catberry's license follows:
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, 
 * publish, distribute, sublicense, and/or sell copies of the Software, 
 * and to permit persons to whom the Software is furnished to do so, 
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS 
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * This license applies to all parts of catberry that are not externally
 * maintained libraries.
 */

'use strict';

module.exports = ServiceLocator;

var util = require('util');

var ARGUMENTS_REGEXP = /\(((\$?\w)+\s*,?\s*)*\)/m,
	DEPENDENCY_REGEXP = /^\$\w+/,
	PARENTHESES_REGEXP = /\(|\)/g,
	ERROR_CONSTRUCTOR_SHOULD_BE_FUNCTION = 'Constructor should be a function',
	ERROR_TYPE_NOT_REGISTERED = 'Type "%s" not registered',
	ERROR_TYPE_SHOULD_BE_STRING = 'Type name "%s" should be a string';

/**
 * Creates new instance of service locator.
 * @constructor
 */
function ServiceLocator() {
	this._registrations = {};
}

/**
 * Current type registrations.
 * @type {Object}
 * @protected
 */
ServiceLocator.prototype._registrations = null;

/**
 * Registers new type in service locator.
 * @param {string} type Type name, which will be alias in other constructors.
 * @param {Function} constructor Constructor which
 * initializes instance of specified type.
 * @param {Object?} parameters Set of named parameters
 * which will be also injected.
 * @param {boolean?} isSingleton If true every resolve will return
 * the same instance.
 */
ServiceLocator.prototype.register =
	function (type, constructor, parameters, isSingleton) {
		throwIfNotFunction(constructor);
		throwIfNotString(type);

		initializeRegistration(type, this);
		var parameterNames = getParameterNames(constructor);

		this._registrations[type].unshift({
			constructor: constructor,
			parameters: parameters || {},
			parameterNames: parameterNames,
			isSingleton: Boolean(isSingleton),
			singleInstance: null
		});
	};

/**
 * Registers single instance for specified type.
 * @param {string} type Type name.
 * @param {Object} instance Instance to register.
 */
ServiceLocator.prototype.registerInstance = function (type, instance) {
	throwIfNotString(type);
	initializeRegistration(type, this);

	this._registrations[type].unshift({
		constructor: instance.constructor,
		parameters: {},
		parameterNames: [],
		isSingleton: true,
		singleInstance: instance
	});
};

/**
 * Resolves last registered implementation by type name
 * including all its dependencies recursively.
 * @param {string} type Type name.
 * @returns {Object} Instance of specified type.
 */
ServiceLocator.prototype.resolve = function (type) {
	throwIfNotString(type);
	throwIfNoType(this._registrations, type);
	var firstRegistration = this._registrations[type][0];
	return createInstance(firstRegistration, this);
};

/**
 * Resolves all registered implementations by type name
 * including all dependencies recursively.
 * @param {string} type Type name.
 * @returns {Array} Array of instances specified type.
 */
ServiceLocator.prototype.resolveAll = function (type) {
	throwIfNotString(type);
	try {
		throwIfNoType(this._registrations, type);
	} catch (e) {
		return [];
	}
	return this._registrations[type].map(function (registration) {
		return createInstance(registration, this);
	}, this);
};

/**
 * Resolves instance of specified constructor including dependencies.
 * @param {Function} constructor Constructor for instance creation.
 * @param {Object?} parameters Set of its parameters values.
 * @returns {Object} Instance of specified constructor.
 */
ServiceLocator.prototype.resolveInstance = function (constructor, parameters) {
	return createInstance({
		constructor: constructor,
		parameters: parameters || {},
		parameterNames: getParameterNames(constructor),
		isSingleton: false,
		singleInstance: null
	}, this);
};

/**
 * Unregisters all registrations of specified type.
 * @param {string} type Type name.
 */
ServiceLocator.prototype.unregister = function (type) {
	throwIfNotString(type);
	delete this._registrations[type];
};

/**
 * Initializes registration array for specified type.
 * @param {string} type Type name.
 * @param {ServiceLocator} context Context of execution.
 */
function initializeRegistration(type, context) {
	if (!context._registrations.hasOwnProperty(type)) {
		context._registrations[type] = [];
	}
}

/**
 * Throws error if specified registration is not found.
 * @param {Object} registrations Current registrations set.
 * @param {string} type Type to check.
 */
function throwIfNoType(registrations, type) {
	if (!registrations.hasOwnProperty(type) ||
		registrations[type].length === 0) {
		throw new Error(util.format(ERROR_TYPE_NOT_REGISTERED, type));
	}
}

/**
 * Throws error if specified constructor is not a function.
 * @param {Function} constructor Constructor to check.
 */
function throwIfNotFunction(constructor) {
	if (constructor instanceof Function) {
		return;
	}

	throw new Error(ERROR_CONSTRUCTOR_SHOULD_BE_FUNCTION);
}

/**
 * Throws error if specified type name is not a string.
 * @param {String} type Type name to check.
 */
function throwIfNotString(type) {
	if (typeof(type) === 'string') {
		return;
	}

	throw new Error(util.format(ERROR_TYPE_SHOULD_BE_STRING, type));
}

/**
 * Creates instance of type specified and parameters in registration.
 * @param {Object} registration Specified registration of type.
 * @param {ServiceLocator} context Context of execution.
 * @returns {Object} Instance of type specified in registration.
 */
function createInstance(registration, context) {
	if (registration.isSingleton && registration.singleInstance !== null) {
		return registration.singleInstance;
	}

	var instanceParameters = getParameters(registration, context);
	var instance = Object.create(registration.constructor.prototype);
	registration.constructor.apply(instance, instanceParameters);

	if (registration.isSingleton) {
		registration.singleInstance = instance;
	}

	return instance;
}

/**
 * Gets constructor parameters specified in type constructor.
 * @param {Object} registration Type registration.
 * @param {ServiceLocator} context Context of execution.
 * @returns {Array} Array of resolved dependencies to inject.
 */
function getParameters(registration, context) {
	return registration.parameterNames.map(function (parameterName) {
		var dependencyName = getDependencyName(parameterName);
		return dependencyName === null ?
			registration.parameters[parameterName] :
			this.resolve(dependencyName);
	}, context);
}

/**
 * Gets name of dependency type.
 * @param {string} parameterName Name of constructor parameter.
 * @returns {string|null} Name of dependency type.
 */
function getDependencyName(parameterName) {
	if (!DEPENDENCY_REGEXP.test(parameterName)) {
		return null;
	}

	return parameterName.substr(1, parameterName.length - 1);
}

/**
 * Gets all parameter names used in constructor function.
 * @param {Function} constructor Constructor function.
 * @returns {Array<string>} Array of parameter names.
 */
function getParameterNames(constructor) {
	var constructorCode = constructor.toString();
	var result = [];
	var constructorArguments = constructorCode.match(ARGUMENTS_REGEXP);

	if (constructorArguments === null ||
		constructorArguments.length === 0) {
		return [];
	}

	constructorArguments[0]
		.replace(PARENTHESES_REGEXP, '')
		.split(',')
		.forEach(function (argumentName) {
			if (!argumentName) {
				return;
			}
			var trimmed = argumentName.trim();
			if (trimmed.length === 0) {
				return;
			}
			result.push(trimmed);
		});

	return result;
}