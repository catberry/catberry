#UHR (Universal HTTP(S) Request)

Catberry has Universal HTTP(S) Request service registered as "uhr" in [Service Locator](../service-locator.md) and accessible via dependency injection.

It has one interface and different implementations on server and browser.

At server it uses node's "http.request" or "https.request" (depend on specified protocol in URL).
At browser it uses jQuery AJAX implementation.

This service has following methods.

```javascript
/**
 * Does GEt request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.get = function (url, options, callback) { }

/**
 * Does POST request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Request options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.post = function (url, options, callback) { }

/**
 * Does PUT request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.put = function (url, options, callback) { }

/**
 * Does DELETE request to HTTP server.
 * @param {string} url URL to request.
 * @param {Object} options Object with options.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.delete = function (url, options, callback) { }

/**
 * Does request with specified parameters.
 * @param {Object} parameters Request parameters.
 * @param {Function<Error, Object, string>?} callback Callback on finish
 * with error, status object and data.
 */
UHRBase.prototype.request = function (parameters, callback) { }
```

Options support:

```javascript
{
	timeout: 30000,
	headers: {
		Cookie: 'name=value'
	},
	data: {
		parameter: 'value'
	}
}
```

In case you do GET/DELETE request "data" will be passed as query string otherwise it will be passed as JSON via request stream.

In callback you always receive:

* Error (if it has happened)
* Status object with HTTP status code, status text and response headers
* Response body as plain text

Status object looks like this:

```javascript
{
	code: 200,
	text: OK,
	headers: {
		'Cache-Control': 'no-cache',
        'Content-Length': '1',
        'Content-Type': 'text/html; charset=utf-8',
        'Date': 'Tue, 08 Apr 2014 05:16:19 GMT'
	}
}
```

Implementation:

* Base: [lib/UHRBase.js](../lib/UHRBase.js)
* Browser: [lib/client/UHR.js](../lib/client/UHR.js)
* Server: [lib/server/UHR.js](../lib/server/UHR.js)