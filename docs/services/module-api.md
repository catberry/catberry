#Module API provider

Catberry has Module API Provider service registered as "moduleApiProvider" in [Service Locator](https://github.com/pragmadash/catberry-locator/blob/master/README.md) and accessible via dependency injection.

If your catberry module need to interact with rendering engine or to do other module-related stuff it should use this service.

Currently it has such methods described below:

```javascript
/**
 * Returns place where current code is executing ('server' or 'browser').
 * @returns {string}
 */
ModuleApiProvider.prototype.whereAmI = function () { }

/**
 * Redirects current page to specified URL.
 * @param {string} locationUrl URL to direct.
 */
ModuleApiProvider.prototype.redirect = function (locationUrl) { }

/**
 * Clears current locations hash.
 */
ModuleApiProvider.prototype.clearHash = function () { }

/**
 * Requests refresh of module's placeholder.
 * @param {Object} moduleReference Reference to any module implementation.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @param {Function} callback Callback on finish.
 */
ModuleApiProvider.prototype.requestRefresh = function (moduleReference, placeholderName, callback) { }
```

If you want to see an example of usage see [example/catberry_modules/chat/ChatModule.js](../../example/catberry_modules/chat/ChatModule.js).

Implementation:

* Browser: [lib/client/ModuleApiProvider.js](../../lib/client/ModuleApiProvider.js)
* Server: [lib/server/ModuleApiProvider.js](../../lib/server/ModuleApiProvider.js)