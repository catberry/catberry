#Cookies Wrapper

Catberry has a cookies wrapper service registered as "cookiesWrapper" in [Service Locator](https://github.com/pragmadash/catberry-locator/blob/master/README.md) and accessible via dependency injection.

Purpose of this service is to parse cookie string and then get cookie values.

When catberry modules receives render request (method render of module was invoked) with whole current application state it receives some service fields.
Actually when current application state is created, new instance of Cookie Wrapper is passed with it to every module and you can get access to it through "parameters.$$.$cookies" like in this [example](../../example/catberry_modules/chat/ChatModule.js#L175).

Currently it has such methods described below:

```javascript
/**
 * Initializes manager with specified cookies string.
 * @param {string} cookiesString Cookies string.
 */
CookiesWrapper.prototype.initWithString = function (cookiesString) { }

/**
 * Gets cookie value by name.
 * @param {string} name Cookie name.
 * @returns {Object}
 */
CookiesWrapper.prototype.get = function (name) { }

/**
 * Parses cookies string into map of cookie objects.
 * @private
 */
CookiesWrapper.prototype._parseCookiesString = function () { }

/**
 * Gets the cookie string that initialized this instance.
 * @returns {string}
 */
CookiesWrapper.prototype.toString = function () { }
```

Implementation:

[lib/CookiesManager.js](../../lib/CookiesManager.js)