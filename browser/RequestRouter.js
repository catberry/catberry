'use strict';

const URI = require('catberry-uri').URI;

const MOUSE_PRIMARY_KEY = 0;
const HREF_ATTRIBUTE_NAME = 'href';
const TARGET_ATTRIBUTE_NAME = 'target';
const A_TAG_NAME = 'A';
const BODY_TAG_NAME = 'BODY';

class RequestRouter {

	/**
	 * Creates a new instance of the browser request router.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current event bus.
		 * @type {EventEmitter}
		 * @private
		 */
		this._eventBus = locator.resolve('eventBus');

		/**
		 * Current browser window.
		 * @type {Window}
		 * @private
		 */
		this._window = locator.resolve('window');

		/**
		 * Current document renderer.
		 * @type {DocumentRenderer}
		 * @private
		 */
		this._documentRenderer = locator.resolve('documentRenderer');

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
		 * True if current browser supports history API.
		 * @type {boolean}
		 * @private
		 */
		this._isHistorySupported = this._window.history &&
			this._window.history.pushState instanceof Function;

		// add event handlers
		this._wrapDocument();

		/**
		 * Current location.
		 * @type {URI}
		 * @private
		 */
		this._location = new URI(this._window.location.toString());

		// set initial state from current URI
		/**
		 * Current state.
		 * @type {Object}
		 * @private
		 */
		this._state = this._stateProvider.getStateByUri(this._location);

		/**
		 * Current initialization flag.
		 * @type {boolean}
		 * @private
		 */
		this._isStateInitialized = false;

		/**
		 * Current referrer.
		 * @type {URI}
		 * @private
		 */
		this._referrer = '';

		this._changeState(this._state)
			.catch(reason => this._handleError(reason));
	}

	/**
	 * Sets an application state for the specified URI.
	 * @param {string} locationString URI to go.
	 * @param {boolean?} isHistoryAction If it's a back or forward history action.
	 * @returns {Promise} Promise for nothing.
	 */
	/* eslint complexity: 0 */
	go(locationString, isHistoryAction) {

		// we must immediately change the URL, therefore this method is synchronous
		try {
			const newLocation = (new URI(locationString)).resolveRelative(this._location);
			const newLocationString = newLocation.toString();

			const currentAuthority = this._location.authority ?
				this._location.authority.toString() : null;
			const newAuthority = newLocation.authority ?
				newLocation.authority.toString() : null;

			// we must check if history API is supported or if this is an external link
			// before mapping URI to internal application state
			if (!this._isHistorySupported ||
				newLocation.scheme !== this._location.scheme ||
				newAuthority !== currentAuthority) {
				this._window.location.assign(newLocationString);
				return Promise.resolve();
			}

			// if only URI fragment is changed we don't need to update
			// the whole state of the app
			const newQuery = newLocation.query ?
				newLocation.query.toString() : null;
			const currentQuery = this._location.query ?
				this._location.query.toString() : null;

			if (newLocation.path === this._location.path &&	newQuery === currentQuery) {
				this._location = newLocation;
				this._window.location.hash = this._location.fragment || '';
				return Promise.resolve();
			}

			const state = this._stateProvider.getStateByUri(newLocation);
			if (!state) {
				this._window.location.assign(newLocationString);
				return Promise.resolve();
			}

			this._state = state;
			this._referrer = this._location;
			this._location = newLocation;

			if (!isHistoryAction) {
				this._window.history.pushState(state, '', newLocationString);
			}

			return this._changeState(state);
		} catch (e) {
			return Promise.reject(e);
		}
	}

	/**
	 * Changes the current application state with the new location.
	 * @param {Object} state New state.
	 * @returns {Promise} Promise for nothing.
	 * @private
	 */
	_changeState(state) {
		return Promise.resolve()
			.then(() => {
				// for "not found" state
				if (state === null) {
					this._window.location.reload();
					return null;
				}

				const routingContext = this._contextFactory.create({
					referrer: this._referrer || this._window.document.referrer,
					location: this._location,
					userAgent: this._window.navigator.userAgent
				});

				if (!this._isStateInitialized) {
					this._isStateInitialized = true;
					return this._documentRenderer.initWithState(state, routingContext);
				}

				return this._documentRenderer.render(state, routingContext);
			});
	}

	/**
	 * Wraps the document with required events to route requests.
	 * @private
	 */
	_wrapDocument() {
		if (!this._isHistorySupported) {
			return;
		}

		// because now location was not change yet and
		// different browsers handle `popstate` differently
		// we need to do route in next iteration of event loop
		this._window.addEventListener('popstate', () =>
			Promise.resolve()
				.then(() => this.go(this._window.location.toString(), true))
				.catch(reason => this._handleError(reason))
		);

		this._window.document.body.addEventListener('click', event => {
			if (event.defaultPrevented) {
				return;
			}
			if (event.target.tagName === A_TAG_NAME) {
				this._linkClickHandler(event, event.target);
			} else {
				const link = closestLink(event.target);
				if (!link) {
					return;
				}
				this._linkClickHandler(event, link);
			}
		});
	}

	/**
	 * Handles a link click on the page.
	 * @param {Event} event Event-related object.
	 * @param {Element} element Link element.
	 * @private
	 */
	_linkClickHandler(event, element) {
		const targetAttribute = element.getAttribute(TARGET_ATTRIBUTE_NAME);
		if (targetAttribute) {
			return;
		}

		// if middle mouse button was clicked
		if (event.button !== MOUSE_PRIMARY_KEY ||
			event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
			return;
		}

		const locationString = element.getAttribute(HREF_ATTRIBUTE_NAME);
		if (!locationString) {
			return;
		}

		event.preventDefault();
		this.go(locationString)
			.catch(reason => this._handleError(reason));
	}

	/**
	 * Handles all errors.
	 * @param {Error} error Error to handle.
	 * @private
	 */
	_handleError(error) {
		this._eventBus.emit('error', error);
	}
}

/**
 * Finds the closest ascending "A" element node.
 * @param {Node} element DOM element.
 * @returns {Node|null} The closest "A" element or null.
 */
function closestLink(element) {
	while (element && element.nodeName !== A_TAG_NAME &&
		element.nodeName !== BODY_TAG_NAME) {
		element = element.parentNode;
	}
	return element && element.nodeName === A_TAG_NAME ? element : null;
}

module.exports = RequestRouter;
