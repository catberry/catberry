#Context

Every module always has a context. Even when module constructor is called 
module already has an initial context with empty state.

Context is an object with methods and data that dependents on current 
application state. You can use context everywhere: at server or in browser, in
constructor or in any methods of module. All context method are 
environment-independent and have different implementations for 
server and browser but module developer should not worry about it, usage of 
context is always safe.

You can access context via `$context` property of your module object. It is
assigned by Catberry on module initialization and then refreshed every time
when application state is changing.

##Environment flags
For some situations you maybe need to determine where current code is executing.
There are two flags in context for this purpose: `isBrowser` and `isServer`. 
Both flags are read-only properties.

##State
Most important thing in context is `state` property. It is an immutable 
object that you can use to know what application parameters now are. 
All these parameters are specified by 
[URL Route Definition](../routing/url-route-definition.md). It is main source 
of input data for rendering and often is used in module [`render` methods]
(render-method.md).

Keep in mind that state object is immutable and every time 
when state is changing it is just re-assigned to context 
therefore it is highly not recommended to save state into variable, 
it can cause unexpected behaviour and memory leaks.

##Rendered data cache
Context also has a set of data contexts that were rendered on page in property
`renderedData`. It can be used to re-use data of other placeholder when 
[`render` method](render-method.md) is working.

It always has last rendered data context for every rendered placeholder. Object
has a structure described below:

```javascript
{
	module1:{
		placeholder1: {
			someData: 'data'
		},
		placeholder2: {
			someData: 'data'
		},
		placeholderN: {
			someData: 'data'
		}
	},
	moduleN:{
		placeholder1: {
			someData: 'data'
		},
		placeholder2: {
			someData: 'data'
		},
		placeholderN: {
			someData: 'data'
		}
	}
}
```

##Cookies
Next property of context is `cookies`. It is an universal wrapper that can `get`
and `set` cookies in environment-independent way.

It has following interface:

```javascript
/**
 * Gets cookie value by name.
 * @param {string} name Cookie name.
 * @returns {Object}
 */
CookiesWrapper.prototype.get = function (name) { }

/**
 * Sets cookie to this wrapper.
 * @param {Object} cookieSetup Cookie setup object.
 * @param {string} cookieSetup.key Cookie key.
 * @param {string} cookieSetup.value Cookie value.
 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
 * @param {Date?} cookieSetup.expire Expire date.
 * @param {string?} cookieSetup.path URL path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @returns {string} Cookie setup string.
 */
CookiesWrapper.prototype.set = function (cookieSetup) { }
```

##Methods
Also context has a lot of useful methods:

```javascript
/**
 * Redirects current page to specified URL.
 * @param {string} locationUrl URL to direct.
 */
ModuleApiProvider.prototype.redirect = function (locationUrl) { }

/**
 * Clears current location's hash.
 */
ModuleApiProvider.prototype.clearHash = function () { }

/**
 * Requests refresh of module's placeholder.
 * Refresh also re-handles current hash event.
 * @param {string} moduleName Name of module to render.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @param {Function?} callback Callback on finish.
 */
ModuleApiProvider.prototype.requestRefresh =
	function (moduleName, placeholderName, callback) { }

/**
 * Requests render of module's placeholder.
 * @param {string} moduleName Name of module to render.
 * @param {string} placeholderName Name of placeholder to refresh.
 * @param {Function?} callback Callback on finish.
 */
ModuleApiProvider.prototype.requestRender =
	function (moduleName, placeholderName, callback) { }
	
/**
 * Subscribes on specified event in Catberry.
 * @param {string} eventName Name of event.
 * @param {Function} handler Event handler.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.on = function (eventName, handler) { }

/**
 * Subscribes on specified event in Catberry to handle once.
 * @param {string} eventName Name of event.
 * @param {Function} handler Event handler.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.once = function (eventName, handler) { }

/**
 * Removes specified handler from specified event.
 * @param {string} eventName Name of event.
 * @param {Function} handler Event handler.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.removeListener = 
	function (eventName, handler) { }

/**
 * Removes all handlers from specified event in Catberry.
 * @param {string} eventName Name of event.
 * @returns {ModuleApiProviderBase} This object for chaining.
 */
ModuleApiProviderBase.prototype.removeAllListeners = function (eventName) { }
```

##How does work redirect, clear hash and cookies manipulating?
Since Catberry uses streaming engine to render page, it can not use HTTP headers
for setting cookies or redirecting pages. It uses rendering of inline 
`<script class="catberry-inline-script">` elements to execute required 
JavaScript to set cookies, redirect or clear hash in location.

If you use such methods as `redirect`, `cookies.set` or `clearHash` in main 
module rendering `__index` placeholder then `<script>` element will be placed in
`<head>` element of page. Otherwise it will be rendered at the beginning of
placeholder content.

After code is executed, `<script>` elements will be removed by Catberry 
initialization due security reasons.

Although `<script>` element are removed after executing it is still not save to
set some cookies that should be 100% secured. It is better to use additional
[connect](https://github.com/senchalabs/connect)/[express]
(https://github.com/visionmedia/express) middleware for this task.

##Context events
As you may notice in context methods subsection, context has method for 
subscribing on Catberry methods, which are described in details in 
[Event Bus and Diagnostics](../event-bus-and-diagnostics.md) 
documentation section.

Read next:

* [Building Browser Bundle](../building-browser-bundle.md)

Read also:

* [Placeholders](placeholders.md)
* [Render Method](render-method.md)
* [Handle Method](handle-method.md)
* [Submit Method](submit-method.md)