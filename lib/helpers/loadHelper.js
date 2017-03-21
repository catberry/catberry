'use strict';

const path = require('path');
const fs = require('../promises/fs');
const moduleHelper = require('./moduleHelper');

const helper = {

	/**
	 * Assigns template engines for component's templates.
	 * @param {Object} component The component.
	 * @param {Array<TemplateProvider>} providers Template providers to assign.
	 * @private
	 */
	assignTemplateProviders: (component, providers) => {
		component.templateProvider = findTemplateProvider(providers, component.properties.template, component.templateSource);
		if (!component.templateProvider) {
			throw new Error(`No template provider found that would be able to compile and render the template "${component.properties.template}" in "${component.name}" component`);
		}

		component.errorTemplateProvider = null;
		if (typeof (component.errorTemplateSource) !== 'string') {
			return;
		}
		component.errorTemplateProvider = findTemplateProvider(providers, component.properties.errorTemplate, component.errorTemplateSource);
		if (!component.errorTemplateProvider) {
			throw new Error(`No template provider found that would be able to compile and render the error template "${component.properties.errorTemplate}" in "${component.name}" component`);
		}
	},

	/**
	 * Loads template sources from the files.
	 * @param {Object} component The component.
	 * @returns {Promise} The promise for finished work.
	 */
	loadTemplateSources: component => {
		const templateSourcePromise = Promise.resolve()
			.then(() => {
				const templatePath = path.resolve(
					path.dirname(component.path),
					component.properties.template
				);
				return fs.readFile(templatePath)
					.then(source => {
						component.templateSource = source.toString();
					});
			});

		const errorTemplateSourcePromise = Promise.resolve()
			.then(() => {
				component.errorTemplateSource = null;
				const relativePath = component.properties.errorTemplate;
				if (typeof (relativePath) !== 'string') {
					return null;
				}
				const templatePath = path.resolve(
					path.dirname(component.path),
					relativePath
				);
				return fs.readFile(templatePath)
					.then(source => {
						component.errorTemplateSource = source.toString();
					});
			});

		return Promise.all([
			templateSourcePromise, errorTemplateSourcePromise
		]);
	},

	/**
	 * Compiles template sources of the component.
	 * @param {Object} component The component.
	 * @returns {Promise} The promise for finished work.
	 */
	compileTemplates: component => {
		const templateCompilePromise = Promise.resolve()
			.then(() => component.templateProvider.compile(component.templateSource, component.name));

		const errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
		const errorTemplateCompilePromise = Promise.resolve()
			.then(() => {
				if (!component.errorTemplateSource) {
					return null;
				}
				return component.errorTemplateProvider.compile(component.errorTemplateSource, errorTemplateName);
			});

		return Promise.all([
			templateCompilePromise,
			errorTemplateCompilePromise
		])
			.then(compiledTemplates => {
				component.compiledTemplate = compiledTemplates[0];
				component.compiledErrorTemplate = compiledTemplates[1] || null;
			});
	}
};

/**
 * Finds a template provider that would work with the template.
 * @param {Array<TemplateProviders>} providers List of template providers.
 * @param {string} filename Filename of the template.
 * @param {string} templateContent Content of the template file.
 * @returns {TemplateProvider|null} Template provider that supports the template.
 * @private
 */
function findTemplateProvider(providers, filename, templateContent) {
	var templateProvider = null;
	providers.some(provider => {
		if (provider.isTemplateSupported(filename, templateContent)) {
			templateProvider = provider;
			return true;
		}
		return false;
	});
	return templateProvider;
}

module.exports = helper;
