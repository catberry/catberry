'use strict';

const moduleHelper = require('./moduleHelper');

const helper = {

	/**
	 * Registers templates into the component and template providers.
	 * @param {Object} component The component.
	 * @param {{template: string, errorTemplate: string}} templates
	 * The compiled templates.
	 */
	registerTemplates: component => {
		component.templateProvider.registerCompiled(component.name, component.compiledTemplate);

		component.template = {
			render: context => component.templateProvider.render(component.name, context)
		};

		if (!component.compiledErrorTemplate) {
			return;
		}

		const errorTemplateName = moduleHelper.getNameForErrorTemplate(component.name);
		component.errorTemplateProvider.registerCompiled(errorTemplateName, component.compiledErrorTemplate);

		component.errorTemplate = {
			render: context => component.errorTemplateProvider.render(errorTemplateName, context)
		};
	},

	/**
	 * Resolves valid template providers.
	 * @param {ServiceLocator} locator Service locator that has providers registered.
	 * @returns {Array<TemplateProvider>} List of template providers.
	 */
	resolveTemplateProviders: locator => {
		const eventBus = locator.resolve('eventBus');
		try {
			return locator
				.resolveAll('templateProvider')
				.filter(provider => {
					const isValid = typeof (provider.getName) === 'function' &&
									typeof (provider.registerCompiled) === 'function' &&
									typeof (provider.render) === 'function';
					if (!isValid) {
						eventBus.emit('warn', 'Template provider does not have required methods, skipping...');
					}
					return isValid;
				});
		} catch (e) {
			return [];
		}
	},

	/**
	 * Resolves valid template providers by names.
	 * @param {ServiceLocator} locator Service locator that has providers registered.
	 * @returns {Object} Map of template providers by names.
	 */
	resolveTemplateProvidersByNames: locator => {
		return helper
			.resolveTemplateProviders(locator)
			.reduce((map, current) => {
				map[current.getName()] = current;
				return map;
			}, Object.create(null));
	}
};

module.exports = helper;
