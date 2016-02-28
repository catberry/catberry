'use strict';

const URI = require('catberry-uri').URI;

const MOUSE_PRIMARY_KEY = 0;
const HREF_ATTRIBUTE_NAME = 'href';
const TARGET_ATTRIBUTE_NAME = 'target';
const A_TAG_NAME = 'A';
const BODY_TAG_NAME = 'BODY';

class RequestRouter {

	/**
	 * Creates new instance of the browser request router.
	 * @param {ServiceLocator} locator Service locator to resolve services.
	 * @constructor
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

		// set initial state from current URI
		const currentLocation = new URI(this._window.location.toString());
		const state = this._stateProvider.getStateByUri(currentLocation);

		/**
		 * Current location.
		 * @type {URI}
		 * @private
		 */
		this._location = currentLocation;

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

		this._changeState(state)
			.catch(reason => this._handleError(reason));
	}

	/**
	 * Routes browser render request.
	 * @param {URI} newLocation New location.
	 * @returns {Promise} Promise for nothing.
	 */
	route(newLocation) {
		// because now location was not change yet and
		// different browsers handle `popstate` differently
		// we need to do route in next iteration of event loop
		return Promise.resolve()
			.then(() => {
				const state = this._stateProvider.getStateByUri(newLocation);
				const newLocationString = newLocation.toString();

				if (!state) {
					this._window.location.assign(newLocationString);
					return null;
				}

				this._window.history.pushState(state, '', newLocationString);

				// if only URI fragment is changed
				const newQuery = newLocation.query ?
						newLocation.query.toString() : null;
				const currentQuery = this._location.query ?
						this._location.query.toString() : null;
				if (newLocation.path === this._location.path && newQuery === currentQuery) {
					this._location = newLocation;
					return null;
				}
				this._location = newLocation;
				return this._changeState(state);
			});
	}

	/**
	 * Sets application state to specified URI.
	 * @param {string} locationString URI to go.
	 * @returns {Promise} Promise for nothing.
	 */
	go(locationString) {
		return Promise.resolve()
			.then(() => {
				const newLocation = (new URI(locationString)).resolveRelative(this._location);
				const newLocationString = newLocation.toString();
				const currentAuthority = this._location.authority ?
						this._location.authority.toString() : null;
				const newAuthority = newLocation.authority ?
						newLocation.authority.toString() : null;

				// we must check if this is an external link before map URI
				// to internal application state
				if (!this._isHistorySupported ||
					newLocation.scheme !== this._location.scheme ||
					newAuthority !== currentAuthority) {
					this._window.location.assign(newLocationString);
					return null;
				}

				return this.route(newLocation);
			});
	}

	/**
	 * Changes current application state with new location.
	 * @param {Object} state New state.
	 * @returns {Promise} Promise for nothing.
	 * @private
	 */
	_changeState(state) {
		return Promise.resolve()
			.then(() => {
				const routingContext = this._contextFactory.create({
					referrer: this._referrer || this._window.document.referrer,
					location: this._location,
					userAgent: this._window.navigator.userAgent
				});

				if (!this._isStateInitialized) {
					this._isStateInitialized = true;
					return this._documentRenderer.initWithState(state, routingContext);
				}

				// for "not found" state
				if (state === null) {
					window.location.reload();
					return null;
				}

				return this._documentRenderer.render(state, routingContext);
			})
			.then(() => {
				this._referrer = this._location;
			});
	}

	/**
	 * Wraps document with required events to route requests.
	 * @private
	 */
	_wrapDocument() {
		if (!this._isHistorySupported) {
			return;
		}

		this._window.addEventListener('popstate', () =>
			this.route(new URI(this._window.location.toString()))
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
	 * Handles link click on the page.
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
		if (locationString[0] === '#') {
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
