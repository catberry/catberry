'use strict';

const hrTimeHelper = require('./helpers/hrTimeHelper');
const catberryURI = require('catberry-uri');
const URI = catberryURI.URI;
const Authority = catberryURI.Authority;

class RequestRouter {

	/**
	 * Creates a new instance of the request router.
	 * @param {ServiceLocator} locator Service locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current page renderer.
		 * @type {DocumentRenderer}
		 * @private
		 */
		this._documentRenderer = locator.resolve('documentRenderer');

		/**
		 * Current logger.
		 * @type {Logger}
		 * @protected
		 */
		this._logger = locator.resolve('logger');

		/**
		 * Current state provider.
		 * @type {StateProvider}
		 * @private
		 */
		this._stateProvider = locator.resolve('stateProvider');

		/**
		 * Current context factory.
		 * @type {ContextFactory}
		 * @private
		 */
		this._contextFactory = locator.resolve('contextFactory');

		/**
		 * Current service locator.
		 * @type {ServiceLocator}
		 * @private
		 */
		this._serviceLocator = locator;
	}

	/**
	 * Creates a routing context, gets the application state and passes it to the renderer.
	 * @param {http.IncomingMessage} request HTTP request.
	 * @param {http.ServerResponse} response HTTP response.
	 * @param {Function?} next Next function for the middleware.
	 */
	route(request, response, next) {
		if (!(next instanceof Function)) {
			next = () => {};
		}

		if (request.method !== 'GET') {
			next();
			return;
		}

		var location, referrer;
		try {
			location = new URI(request.url);
		} catch (e) {
			location = new URI();
		}
		try {
			referrer = new URI(request.headers.referer);
		} catch (e) {
			referrer = new URI();
		}

		var cookieString = '';
		var userAgent = '';
		if (request.headers) {
			location.authority = new Authority(request.headers.host);
			userAgent = String(request.headers['user-agent'] || '');
			cookieString = String(request.headers.cookie || '');
		}

		const state = this._stateProvider.getStateByUri(location);
		if (!state) {
			next();
			return;
		}

		const routingContext = this._contextFactory.create({
			referrer,
			location,
			userAgent,
			middleware: {
				response,
				next
			}
		});
		routingContext.cookie.initWithString(cookieString);
		const requestStartTime = hrTimeHelper.get();
		const method = request.method;
		const uriPath = request.url;
		const address = request.socket.remoteAddress;
		const port = request.socket.remotePort;

		this._logger.trace(`Request to ${method} "${uriPath}" from ${address}:${port}`);

		response.on('finish', () => {
			const requestDuration = hrTimeHelper.get(requestStartTime);
			const timeMessage = hrTimeHelper.toMessage(requestDuration);

			this._logger.trace(`Response from ${method} "${uriPath}" to ${address}:${port} (${timeMessage})`);
		});

		this._documentRenderer.render(state, routingContext);
	}
}

module.exports = RequestRouter;
