#Cookies Manager

Catberry has cookies manager service registered as "cookiesManager" in [Service Locator](../service-locator.md) and accessible via dependency injection.

Purpose of this service to parse cookie string and then add/edit/remove cookie values. After some changes you can export results to cookie string or to array of cookie setups.

When catberry modules receives render request (method render of module was invoked) with whole current application state it receives some service fields.
Actually when current application state is created new instance of Cookie Manager is passed with it to every module and you can get access to it through "parameters.$$.$cookies" like in this [example](../example/catberry_modules/chat/ChatModule.js#L175).

**Warning**: Keep in mind that you can not change cookies on server-side inside Catberry modules because when module processes response HTTP headers is sent already. But feel free to edit cookies in browser.

Currently it has such methods described below:

```javascript
/**
 * Initializes manager with specified cookies string.
 * @param {string} cookiesString Cookies string.
 */
CookiesManager.prototype.initWithString = function (cookiesString) { }

/**
 * Gets cookie object by name.
 * @param {string} name Cookie name.
 * @returns {Object}
 */
CookiesManager.prototype.get = function (name) { }

/**
 * Sets cookie object.
 * @param {string} name Cookie name.
 * @param {Object} cookie Cookie object.
 * @param {string} cookie.value Value of cookie.
 * @param {string?} cookie.path cookie Cookie URL path.
 * (e.g., '/', '/mydir').
 * @param {string?} cookie.domain Cookie domain
 * (e.g., 'example.com', '.example.com' (includes all subdomains).
 * @param {number?} cookie.maxAge Max cookie age in seconds
 * (e.g., 60*60*24*365 for a year)
 * @param {Date?} cookie.expires Date of expiration.
 * @param {boolean?} cookie.secure If true cookie will be passed only via HTTPS.
 */
CookiesManager.prototype.set = function (name, cookie) { }

/**
 * Removes cookie by specified name.
 * @param {string} name Name of cookie.
 * @returns {boolean}
 */
CookiesManager.prototype.remove = function (name) { }

/**
 * Returns cookie string.
 * @returns {string}
 */
CookiesManager.prototype.toString = function () { }

/**
 * Builds cookies strings array using current map of cookies to set new cookies.
 * @returns {Array<string>}
 */
CookiesManager.prototype.toArray = function () { }
```

Implementation:

[lib/CookiesManager.js](../../lib/CookiesManager.js)