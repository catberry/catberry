'use strict';

const DocumentRendererBase = require('./base/DocumentRendererBase');
const ComponentReadable = require('./streams/ComponentReadable');

class DocumentRenderer extends DocumentRendererBase {

	/**
	 * Creates a new instance of the document renderer.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {
		super(locator);
	}

	/**
	 * Renders a response on the request with the specified state and routing context.
	 * @param {Object} state State of the application.
	 * @param {Object} routingContext Routing Context.
	 */
	render(state, routingContext) {
		this._getPromiseForReadyState()
			.then(() => {
				const renderingContext = {
					isDocumentRendered: false,
					isHeadRendered: false,
					config: this._serviceLocator.resolve('config'),
					renderedIds: Object.create(null),
					routingContext,
					storeDispatcher: this._serviceLocator.resolve('storeDispatcher'),
					logger: this._serviceLocator.resolve('logger'),
					eventBus: this._eventBus,
					components: this._componentLoader.getComponentsByNames()
				};
				renderingContext.storeDispatcher.setState(state, routingContext);

				const renderStream = new ComponentReadable(renderingContext);

				renderStream.renderDocument();
				renderStream
					.pipe(routingContext.middleware.response)
					.on('finish', () => this._eventBus.emit('documentRendered', routingContext));
			})
			.catch(reason => this._eventBus.emit('error', reason));
	}
}

module.exports = DocumentRenderer;
