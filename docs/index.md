# Catberry Framework Documentation

![Catberry](images/logo.png) 

# Table Of Contents
* [Isomorphic Applications](#isomorphic-applications)
* [Flux](#flux)
* [Stores](#stores)
* [Cat-components](#cat-components)
* [Example of Application Structure](#example-of-application-structure)
* [Routing](#routing)
* [Catberry Services](#catberry-services)
	* [Service Locator](#service-locator)
	* [Dependency Injection](#dependency-injection)
	* Userland Catberry Services
		* [Logger](#logger)
		* [Config](#config)
		* [Universal HTTP(S) Request](#uhr-universal-https-request)
* [Cookie](#cookie)
* [Template Engines](#template-engines)
* [Browser Bundle](#browser-bundle)
* [Event Bus and Diagnostics](#event-bus-and-diagnostics) 
* [CLI](#cli)
* [Get Started](#get-started)
* [Code Style Guide](code-style-guide.md)

# Isomorphic Applications
Make a long story short, isomorphic applications are built to make it possible 
to write module once and use it for both pages rendering on server
(for SEO and shared links) and in browser with no server side at all.
It means on server your modules are executing the same code as 
in a browser. This [Single Page Application]
(http://en.wikipedia.org/wiki/Single_Page_Application) 
can render all parts of the page using the same isomorphic modules and not
reloading the page at all.

There is an awesome [post in Airbnb technical blog]
(http://nerds.airbnb.com/isomorphic-javascript-future-web-apps/) 
about the idea of isomorphic JavaScript applications and what exactly it is.
Also, you can find the video [Spike Brehm: Building Isomorphic Apps]
(http://www.youtube.com/watch?v=CH6icJbLhlI)
from JSConf 2014 talks.

Isomorphic applications can work with a set of independent RESTful services that
implement some business logic (Facebook API, Twitter API, your API etc).
In fact, each module in isomorphic application should receive all data from 
API server which could be written using any platform you want using REST approach.

There is a list of problems which are solved by isomorphic applications:

* *Using Single Page Applications causes SEO problems*. Your isomorphic
modules will render exactly the same page on the server as it is in a browser
* *Code duplication for rendering parts of the page at the server
and in the browser, sometimes it is even written in different programming
languages*. Since isomorphic modules are written only once and in JavaScript
you do not have this problem.
* *Maintenance is complicated because you need to synchronize changes
in server-side and browser modules*. Obviously, you do not need it
using isomorphic modules. It is always one module to change.
* *Overhead connected with rendering all pages on the server*. Since browsers
receive a page from the server only once and then render all other pages themselves,
your server's load will be reduced dramatically.
 
And maybe a lot of more problems, who knows.

Technologies like History API and node.js make this type 
of applications possible and we should use this possibility.

**[⬆ back to top](#table-of-contents)**

# Flux
Catberry uses [Flux](https://facebook.github.io/flux/docs/overview.html)
architecture. It defines that you should use [store](#stores) as data source
and some kind of view that gets data from the store. So, Catberry uses
[cat-components](#cat-components) as these views.

Everything you need to know that there are [stores](#stores),
[cat-components](#cat-components) and store dispatcher that controls the whole
workflow.

[Store](#stores) can handle some action messages
from [cat-components](#cat-components) and they can trigger `changed` event.
The event `changed` means that Catberry should re-render in the browser
every component that depends on changed store.

Store dispatcher works in such way that does not allow to call store
data loading while previous loading is not over, also it does not allow
some crazy cases when all your [stores](#stores) trigger `changed` event at
the same time and re-rendering of component breaks everything.
This is the robust high-performance architecture that allows to create huge and
complicated applications.

One more thing about Catberry architecture: the main approach in Catberry
for controlling asynchronous operations is [Promise](https://www.promisejs.org/).
Catberry uses the native `Promise` in a browser or in Node.js (V8)
if it is possible. If global type `Promise` is not found it will be defined using
["Bare bones Promises/A+ implementation"](https://www.npmjs.org/package/promise).
It means you can use `Promise` type globally and do not worry about its support.

**[⬆ back to top](#table-of-contents)**

# Stores
The store is a module that loads data from a remote resource using routing
parameters. It also can handle action messages from anywhere and send requests
to the remote resource changing data. It can emit `changed` event at any time
when it decided that data on the remote resource is changed.

By default, all stores should be placed into `./catberry_stores` directory
of your application. But you can change this directory by [config](#config)
parameter. Every file should export constructor function for creation of store
instance.

When Catberry initializes it does recursively search in this directory and loads
every file. The relative file path without extension becomes a store name.

So if you have such file hierarchy as listed below:
```
./catberry_stores/
	group1/
		store1.js
		store2.js
	group2/
		store1.js
		store2.js
	store1.js
	store2.js
```
then you will have such store list:
```
group1/store1
group1/store2
group2/store1
group2/store2
store1
store2
```

Please, keep in mind that all store names are case-sensitive.

## Store interface
As it is said every store should export a constructor function. Also you can
define such methods and properties into constructor prototype,
but all of them are optional.

* $lifetime – this field sets how long Catberry should cache data loaded
from this store (milliseconds). By default, it is set to 60000ms.
* `load()` – loads and returns data (or Promise for it) from a remote resource
* `handle<SomeActionNameHere>(args)` – does action and returns
the result (or Promise for it). You can submit data to a remote resource here or
just change some internal parameters in the store and then
call `this.$context.changed()`. For example, the method can be
named `handleFormSubmit` and when action with name
`form-submit` or `form_submit` or `FORM_SUBMIT` or `formSubmit`or `FormSubmit`
will be sent by any component this method will be called

Please, keep in mind that stores are isomorphic and they are executing from
both server and client-side environments. Therefore you can not
use environment-specific global objects and functions like
`window`, `process` or DOM methods.

## Store Context
Every store always has a context. Catberry sets the property `$context`
to every instance of each store. It has following properties and methods.

* `this.$context.isBrowser` – true if it executes in the browser environment
* `this.$context.isServer` – true if it executes in the server environment
* `this.$context.userAgent` – current user agent string of client
* `this.$context.cookie` – current cookie wrapper object
* `this.$context.location` – current [URI](https://github.com/catberry/catberry-uri) object
of current location
* `this.$context.referrer` – current [URI](https://github.com/catberry/catberry-uri) object
of current referrer
* `this.$context.state` – the current set of parameters for current store parsed
from routing definition
* `this.$context.locator` – Service Locator of the application
* `this.$context.redirect('String')` - Redirects to specified location string
* `this.$context.changed()` – Triggers `changed` event for current store.
You can use this method whenever you want, Catberry handles it correctly.
* `this.$context.getStoreData('storeName')` – gets promise for
another store's data, if `storeName` is the same as current it will be `null`.
* `this.$context.sendAction('storeName', ‘name’, object)` – sends action to
store by name and returns a promise of the action handling result. If
the store does not have a handler for this action the result is always `null`.
* `this.$context.sendBroadcastAction(‘name’, object)` – the same as previous but
the action will be sent to all stores that have handler for this action. Returns
promise for `Array` of results.
* `this.$context.setDependency(‘storeName’)` – sets a dependency store
for current store. Every time the dependency store changes, current store
also will trigger `changed` event.
* `this.$context.unsetDependency(‘storeName’)` – removes dependency store
described in the previous method.

Every time router computes new application state it re-creates and re-assigns
context to each store, therefore, do not save references to `this.$context`
objects.

Please keep in mind that if you use `getStoreData` method and data from
another store in `load` method you should set that store as a dependency for
current store (`this.$context.setDependency(‘storeName’)`), otherwise
cache of current store will not be updated if store-dependency is changed.
For example, you have two stores `Country` and `CityList` and you do
`this.$context.getStoreData('Country')` in `CityList.prototype.load`.
In this case, if `Country` store is changed `CityList` will not changed.
To avoid this just add `this.$context.setDependency(‘Country’)` to
the `CityList` constructor.

## Code example
This is an example how your store can look like:

```javascript
'use strict';

module.exports = Some;

/**
 * Creates a new instance of the "some" store.
 * @param {UHR} $uhr Universal HTTP request.
 * @constructor
 */
function Some($uhr) {
	this._uhr = $uhr;
}

/**
 * Current universal HTTP request to do it in isomorphic way.
 * @type {UHR}
 * @private
 */
Some.prototype._uhr = null;

/**
 * Current lifetime of data (in milliseconds) that is returned by this store.
 * @type {number} Lifetime in milliseconds.
 */
Some.prototype.$lifetime = 60000;

/**
 * Loads data from a remote source.
 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
 */
Some.prototype.load = function () {
	// Here you can do any HTTP requests using this._uhr.
	// Please read details here https://github.com/catberry/catberry-uhr.
};

/**
 * Handles action named "some-action" from any component.
 * @returns {Promise<Object>|Object|null|undefined} Response to component.
 */
Some.prototype.handleSomeAction = function () {
	// Here you can call this.$context.changed() if you know
	// that remote data source has been changed.
	// Also you can have many handle methods for other actions.
};
```

**[⬆ back to top](#table-of-contents)**

# Cat-components
You may think cat-components are mustaches, paws or tail but they are not.

Cat-component is an isomorphic implementation of
[Google Web-Components](http://webcomponents.org/). If dig deeper it is a
subset of features that web-components specification declares.

The main point is that cat-component is a declaration of custom tag that can
have own template (any template engine), own logic in JavaScript and own assets.

Cat-component is declared as a directory with `cat-component.json`
file by default. But you can change it in [config](#config).
When Catberry initializes it does recursively search for such directories
starting with your application root. It means you can publish and use
cat-components from [npm](http://npmjs.org/).

`cat-component.json` consists of following:

* name – the name of the component and postfix of custom tag
(optional, by default it is the name of the directory).
* description – some additional information about cat-component (optional)
* template – relative path to component template (required)
* errorTemplate – relative path to component template for an error state (optional)
* logic – relative path to file that exports constructor for logic object
(optional, index.js by default)

For example:

```json
{
	"name": "cool",
	"description": "Some awesome and cool cat-component",
	"template": "./template.hbs",
	"errorTemplate": "./errorTemplate.hbs",
	"logic": "./Cool.js"
}
```

In this example above you wil get a custom tag `<cat-cool></cat-cool>` in your
application.

Please, keep in mind that all store names are NOT case-sensitive. If you
declare component with the same name twice you will receive a warning message on
startup.

After you define a cat-component you can use it like this:

```html
<cat-cool id="unique-value" cat-store="group/store1" some-additional="value" ></cat-cool>
```

There are some important moments here:
* Every component tag should have an `id` attribute with a unique value, otherwise
it is not rendered and throws an error
* You can set `cat-store` attribute that means if store is changed this
component will be re-rendered automatically
* You can set any additional attributes you want without any problems
* You should always use open and close tags (not self-closing tags). The most
of browsers do not support self-closing custom tags.
* You can use tags of other components in the template of any component

There are two reserved component names that are used in unusual way:
* document – the root template of the entire application (doctype, html, body etc.).
It can not depend on any store. `cat-store` attribute is just ignored.
* head – the component for HEAD element on the page. It always is rendered in
diff/merge mode otherwise all styles and scripts are re-processed every time. It
can depend on a store and works as usual cat-component except rendering approach.

## Cat-component interface
As store component's logic file should export a constructor function for
creating instances for every custom tag on the page. Also you can
define such methods and properties into constructor prototype,
but all of them are optional.

* `render()` – creates and returns data (or Promise for it) for component template
* `bind()` – creates and returns an object with event bindings (or Promise for it)
* `unbind()` – this method is like a destructor and if you want to manually remove
some listeners or to do something else you can implement this method

Some more details about `bind()` method:
It is supported that `bind()` method returns an object that describes all event
bindings inside the template of the current component. You can return binding object
(or Promise for it) like this.

```javascript
Cool.prototype.bind = function () {
	return {
		click: {
			'a.clickable': this._clickHandler,
			'div#some': this._someDivHandler
		},
		hover: {
			'a.clickable': this._clickableHoverHandler
		}
	};
};
```

As you may notice, every event handler is bound to the current instance of
the component, you do not need to use
[`.bind(this)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
by yourself. Also, you can use bind method to make additional bindings outside
the component and then unbind it manually in `unbind` method.

After a component is removed from the DOM all event listeners will be removed
correctly and then `unbind` method will be called (if it exists).

Please, keep in mind that cat-component's constructor and `render` methods
are isomorphic and they are executing from both server and client-side
environments. Therefore, you can not use environment-specific global objects
and functions like `window`, `process` or DOM methods inside these methods.

## Cat-component Context
Every component always has a context. Catberry sets the property `$context`
to every instance of each store. It has following properties and methods.

* `this.$context.isBrowser` – true if it executes in the browser environment
* `this.$context.isServer` – true if it executes in the server environment
* `this.$context.userAgent` – current user agent string of client
* `this.$context.cookie` – current cookie wrapper object
* `this.$context.location` – current [URI](https://github.com/catberry/catberry-uri) object
of current location`
* `this.$context.referrer` – current [URI](https://github.com/catberry/catberry-uri) object
of current referrer`
* `this.$context.locator` – Service Locator of the application
* `this.$context.element` – current DOM element that is a root of the current component
* `this.$context.attributes` – set of attributes are set when component was
rendered the last time
* `this.$context.redirect('String')` - redirects to specified location string
* `this.$context.getComponentById(‘id’)` – gets other component by ID
* `this.$context.createComponent(‘tagName’, attributesObject)` – creates new
component and returns promise for its root DOM element
* `this.$context.collectGarbage()` – collects all components created with
`createComponent` method and that still are not attached to the DOM.
* `this.$context.getStoreData()` – gets promise for store data if component
depends on any store
* `this.$context.sendAction(‘name’, object)` – sends action to store if component
depends on any store and returns a promise of the action handling result. If
the store does not have a handler for this action the result is always `null`.
* `this.$context.sendBroadcastAction(‘name’, object)` – the same as previous but
the action will be sent to all stores that have handler for this action. Returns
promise for `Array` of results.

Every time router computes new application state, it re-creates and re-assigns
context to each component, therefore, do not save references to `this.$context`
objects.

## Code example
This is an example how your cat-component can look like:

```javascript
'use strict';

module.exports = Some;

/**
 * Creates a new instance of the "some" component.
 * @constructor
 */
function Some() {

}

/**
 * Gets data context for the template engine.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Data context
 * for the template engine.
 */
Some.prototype.render = function () {

};

/**
 * Returns event binding settings for the component.
 * This method is optional.
 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
 */
Some.prototype.bind = function () {

};

/**
 * Does cleaning for everything that have NOT been set by .bind() method.
 * This method is optional.
 * @returns {Promise|undefined} Promise or nothing.
 */
Some.prototype.unbind = function () {

};

```

**[⬆ back to top](#table-of-contents)**

# Example of Application Structure
Typically directory structure of your application should look like this:

```
./catberry_stores/
	group1/
		store1.js
		store2.js
	group2/
		store1.js
		store2.js
	store1.js
	store2.js
./catberry_components/
	document/
		assets/
			favicon.ico
			logo.jpg
			style.css
		index.js
		template.hbs
		cat-component.json
	component1/
		assets/
			some.png
			some.css
		index.js
		template.hbs
		errorTemplate.hbs
		cat-component.json

 # directory for your own external not catberry modules/services
./lib/
 # this directory is the default destination for browser bundle building
 # and it will be re-created on every start of Catberry application.
./public/
	# this directory is the default destination for copying assets
	assets/
		document
			favicon.ico
			logo.jpg
			style.css
		component1
			some.png
			some.css
	bundle.js
 # entry script for the browser code
./browser.js
 # route definitions
./routes.js
 # entry script for the server code
./server.js
```

If you want to see finished application as an example then please proceed to the
[example directory](https://github.com/catberry/catberry-cli/tree/master/templates/example).

**[⬆ back to top](#table-of-contents)**

# Routing
Catberry's routing system triggers the "changed" event in every
[store](#stores) that depends on changed arguments in routed URI.
Those arguments are set by route definitions in file './routes.js'.

When you change the URI in a browser or send a request to the server Catberry
computes the application state using those definitions and pass
it to Store Dispatcher that controls everything related to stores.

After any store emits "changed" event every [cat-component](#cat-components)
depended on this store will be also re-rendered in a browser.

Route definition is a rule that describes which URIs are handled by Catberry,
what parameters Catberry can parse from these URIs and what stores will
receive parsed parameters.

## Colon-marked parameters in string
Default definition syntax is following:

```
/some/:id[store1,store2]/actions?someParameter=:parameter[store1]
```

All parameters should be marked with the colon at the beginning and
optionally followed by the list of store names that will receive the value
of this parameter. These stores are called stores-dependants.
This list can also be empty.

In previous example `id` value will be set to states of stores
`store1`, `store2`; and `parameter` value will be set only to the state
of store `store1`.

Please keep in mind that parameter **name** in route definition should satisfy
regular expression `[^\[\],]+` and parameter **value** should satisfy
regular expression `[^\\\/&?=]*`.

## Colon-marked parameters with additional `map` function
Also, you can define mapper object, that allows you to modify application
state object before it will be processed by Catberry.

If you want to use a `map` function just define route like this:

```javascript
{
	expression: '/user/news/:category[news]',
	map: function(state) {
		state.news.pageType = 'userNews';
		return state;
	}
}

```
Map function receives the state prepared by route definition string.
State is an object, where keys are store names and values are state
objects for every store. You can change entire state object if you want
and return it from a map function.

In this example, store `news` will receive additional state parameter `pageType`
with value `userNews`.

## Regular expression
For some rare cases, you may need to parse parameters
by regular expressions. In these cases you can define mapper
object as listed below:

```javascript
{
	expression: /^\/orders\/\d+/i,
	map: function(uri) {
		var matches = uri.path.match(/^\/orders\/(\d+)/i);
		return {
			order:{
				orderId: Number(#matches[1])
			}
		};
	}
}
```

In this example the store `order` will receive parameter `orderId` with value
matched with a number in URL.

## URL with any query parameters
If the route definition includes any query parameters they are always optional.
For example if you have such route definition:
```
/some/:id[store1,store2]/actions?a=:p1[store1]&b=:p2[store1]&c=:p3[store1]
```
Now if you try to route such URL:
```
/some/1/actions?b=123
```
you will receive the state:
```javascript
{
	store1: {
		id: "1",
		p2: "123"
	},
	store2: {
		id: "1"
	}
}
```
The parameters `p1` and `p3` will be skipped.
You can even route the URL without any query parameters at all.
```
/some/1/actions
```
and receive such state
```javascript
{
	store1: {
		id: "1"
	},
	store2: {
		id: "1"
	}
}
```

## File example
Here is an example of `./routes.js` file with all 3 cases of the route definition:

```javascript
module.exports = [
	'/user/:id[user,menu,notifications]',
	{
		expression: '/user/news/:category[news]',
		map: function(state) {
			state.news.pageType = 'userNews';
			return state;
		}
	},
	{
		expression: /^\/orders\/\d+/i,
		map: function(urlPath) {
			var matches = urlPath.match(/^\/orders\/(\d+)/i);
			return {
				orderId: Number(matches[1])
			};
		}
	}
];
```

**[⬆ back to top](#table-of-contents)**

# Catberry Services
Let's talk about Catberry Framework for isomorphic applications.
In Catberry, every framework component such as Logger or
Universal HTTP(S) Request module are called "Services".

Entire Catberry architecture is built using [Service Locator]
(http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and 
[Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).
Service Locator is a Catberry core component that stores information about
every Catberry's component (service). It is similar with
[IoC](http://en.wikipedia.org/wiki/Inversion_of_control) Container
in other platforms. So, if any components depend on others it just says it to
Service Locator and it creates instances of every required dependency.
For example, every component and even userland
Catberry module can ask for a "logger" service to log messages to the console.

When Catberry initializes itself it fills Service Locator with own set of
services, but framework users can also register own plugins (services)
and even overwrite implementation of some Catberry services.
For example, you can replace Logger service in Service Locator with
your favorite logger, you just need to write an adapter that matches
the interface of [Catberry "logger" service](#logger).
 
To register your own services, you should keep in mind that
you probably need different implementations of your service for the server
and the browser environment. But in some cases it does not matter.

Learn more how to use Service Locator in next section.

## Service Locator
Entire architecture of Catberry framework is based on
[Service Locator pattern](http://en.wikipedia.org/wiki/Service_locator_pattern) 
and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).

## Registration of Own Services
There is only one service locator (singleton) in a Catberry application
and all Catberry services are resolved from this locator.
It happens when you use `getMiddleware` method on the server or `startWhenReady`
method in the browser code.
Before that, feel free to register your own services.

Your Catberry application can have `./server.js` with code like this:
```javascript
var catberry = require('catberry'),
	RestApiClient = require('./lib/RestApiClient'),
	connect = require('connect'),
	config = require('./server-config'),
	cat = catberry.create(config),
	app = connect();

// when you have created an instance of Catberry application
// you can register everything you want in Service Locator.
// last "true" value means that the instance of your service is a singleton
cat.locator.register('restApiClient', RestApiClient, config, true);

// you can register services only before this method below
app.use(cat.getMiddleware());
// now Catberry already has initialized the whole infrastructure of services
app.use(connect.errorHandler());
http
	.createServer(app)
	.listen(config.server.port || 3000);

```

Also for the browser you application can have `./browser.js` with code
like this:
```javascript
var catberry = require('catberry'),
	RestApiClient = require('./lib/RestApiClient'),
	config = require('./browser-config'),
	cat = catberry.create(config);

// when you have created an instance of Catberry application
// you can register everything you want in Service Locator.
// last "true" value means that instance of your server is a singleton
cat.locator.register('restApiClient', RestApiClient, config, true);

// you can register services only before this method below
cat.startWhenReady(); // returns promise
// now Catberry already has initialized the whole infrastructure of services
```

Also, you can override some existing service registrations, for example, Logger:
 
```javascript
cat.locator.register('logger', MyCoolLogger, config, true);
```

It registers one more implementation of logger and Catberry always uses the last
registered implementation of every service.

You can also get an access to all registered implementations of any service
using `resolveAll` method.

If you want to know how to use registered services, please read
[Dependency Injection](#dependency-injection) section.

* [Interface of Service Locator](https://github.com/catberry/catberry-locator/blob/master/lib/ServiceLocator.js)

## Dependency Injection
If you need to use some registered service you just inject it into a constructor
of [Store](#stores) or [Cat-component](#cat-components).

For example, you have the store called "AwesomeStore".
In Catberry, every store is a constructor with prototype,
to inject "logger" service, your own "restApiClient" service and
someConfigKey from the config object you just can do that:

```javascript
function AwesomeStore($logger, $restApiClient, someConfigKey) {
	// here the $logger and the $restApiClient are instances
	// of registered services.
	// someConfigKey is a field from startup-config object.
	// Every injection without '$' at the beginning is a config field
}
```

When you start an application in release mode this code
will be optimized (minified) for the browser,
but all these injections will stay as is and will not be broken.

Also, you can inject just `$serviceLocator` and resolve everything you want
directly from locator.

It is really important not to make loops in the graph of dependencies. It causes
infinite recursion and just kills your application.

Please keep in mind that config fields can be injected only side by side
with service injections. If you want to inject only config section
alone it will not work, use $config injection instead.

Read also:

Userland Services

* [Logger](#logger)
* [Config](#config)
* [Universal HTTP(S) Request](#uhr-universal-https-request)

## Logger
Catberry has a universal logger service registered as "logger" in
[Service Locator](#service-locator) and it is accessible via
[dependency injection](#dependency-injection).

Just inject `$logger` into your store or component.
Also, it can be resolved from Service Locator directly.

This logger implementation has standard for almost every logger methods
{trace, warn, info, error, fatal}. 
Last two support Error object to be passed as the only argument.

Actually when you use this service at the server it uses
[log4js](https://www.npmjs.org/package/log4js) module inside. 
It means you can configure it as described [here]
(https://github.com/nomiddlename/log4js-node) in its README file.

In a browser, it is implemented as a very simple logger that can only write
to the browser's console.

### Configuration
To configure the browser logger you can set a config field `logger` in the
Catberry config object.

Like this for browser logger:
```json
{
	"logger": {
		"levels": "warn,error"
	}
}
```

To configure the server logger you have to set the configuration like this:
```json
{
	"logger": {
			"appenders": [
				{
					"type": "console",
					"category": "catberry"
				},
				{
					"type": "gelf",
					"host": "logserver.example",
					"hostname":"my.app",
					"port": "12201",
					"facility": "MyApp",
					"category": "catberry"
				}
			],
			"levels": {
				"catberry": "TRACE"
			}
		},
}
```
More details [here](https://github.com/nomiddlename/log4js-node#usage).

* [Interface of Browser Logger](../browser/Logger.js)
* [Interface of Server Logger (log4js)](https://www.npmjs.org/package/log4js)

## Config
Catberry has a configuration object registered as "config" service in
[Service Locator](#service-locator) and it is accessible via
[dependency injection](#dependency-injection).

Just inject `$config` into your module or resolve it from 
Service Locator directly.

This service is just a full config object which was passed to `catberry.create()`
method.

Catberry uses following parameters from it:

* componentsGlob – glob expression for searching cat-components,
can be an string array or just a string
(`['catberry_components/**/cat-component.json','node_modules/*/cat-component.json']` by default)
* storesDirectory – relative path to the directory with stores
("./catberry_stores" by default)
* publicDirectoryPath – path to public directory
("./public" by default)

## UHR (Universal HTTP(S) Request)
Catberry has Universal HTTP(S) Request service registered as "uhr" in 
[Service Locator](#service-locator) and it is accessible via
[dependency injection](#dependency-injection).

This is isomorphic implementation of HTTP request.
All details you can find in UHR readme file [here]
(https://github.com/catberry/catberry-uhr/blob/master/README.md).

**[⬆ back to top](#table-of-contents)**

# Cookie
As you may notice, store and cat-component context have a property `cookie` that
allows you to control cookie in isomorphic way.
Actually, it is a universal wrapper that can `get` and `set` cookie
in environment-independent way.

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
 * @param {Date?} cookieSetup.expires Expire date.
 * @param {string?} cookieSetup.path URL path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @returns {string} Cookie setup string.
 */
CookiesWrapper.prototype.set = function (cookieSetup) { }

/**
 * Gets current cookie string.
 * @returns {string} Cookie string.
 */
CookieWrapper.prototype.getCookieString = function () { }

/**
 * Gets map of cookie values by name.
 * @returns {Object} Cookies map by names.
 */
CookieWrapperBase.prototype.getAll = function () { }
```

**[⬆ back to top](#table-of-contents)**

# Template engines
Catberry supports any template engine that have the "precompiling to string" feature.
Currently [Dust](https://github.com/catberry/catberry-dust),
[Handlebars](https://github.com/catberry/catberry-handlebars), and
[Jade](https://github.com/catberry/catberry-jade) are officially supported
but you can create own adapter for any template engine,
just take a look how it is done for [Handlebars](https://github.com/catberry/catberry-handlebars).

To set template engine you just need to register template provider like this:
```javascript
var handlebars = require('catberry-handlebars'),
	cat = catberry.create(config);
handlebars.register(cat.locator);
```

Actually, [Catberry CLI](#cli) does it for you, see its [readme]([Catberry CLI](https://github.com/catberry/catberry-cli)).

**[⬆ back to top](#table-of-contents)**

# Browser Bundle
The Catberry application object has a method `build` that can be used like this:

```javascript
var catberry = require('catberry'),
	cat = catberry.create();
cat.build(); // returns a promise
```

This method can be called in `./server.js` script or separately in
different script and process.

It is highly recommended to use `build` method in separated process 
(not in server process) because JavaScript minification requires a lot of memory 
and it looks like your `./server.js` script uses 1GB of RAM, which is not so of
course.

For example you can use `./build.js` script like this:
```
node ./build.js release
```

To build browser bundle, Catberry uses [browserify](http://browserify.org) which
is awesome and can convert your server-side JavaScript to browser code.

## Including packages into the browser bundle
There are some rules according browserify limitations:

* If you want to include some module into browser bundle it should be required
directly via `require('some/path/to/module')`. If module path is a variable
browserify just skips it or throws an error.
* If you want to exclude some server-side package from browser bundle or 
replace it with browser version just use browserify `browser` field
in `package.json` as it has been described [here](http://github.com/substack/node-browserify#packagejson).

## Code watching and reloading
By default, Catberry works in debug mode and it means that all changes in code
of your stores or components will automatically reload everything.
You can switch application to release mode passing `isRelease: true` parameter
in config object application like this:

```javascript
var catberry = require('catberry'),
cat = catberry.create({isRelease: true}),
```

So, the difference between modes is:
* Debug mode - everything is watched by builder that rebuilds everything
 if something is changed
* Release mode - there is no watch on files and all code in the browser bundle
is minified using [uglify-js](https://www.npmjs.org/package/uglify-js)

**[⬆ back to top](#table-of-contents)**

# Event Bus and Diagnostics
Catberry has a set of events that can be used for diagnostics or
in components and stores. Catberry uses the same events for logging all trace,
info and error messages.

There are two ways of listening to Catberry event:

* Subscribe on it using Catberry application instance directly like this

```javascript
var catberry = require('catberry'),
	cat = catberry.create();

cat.events.on('error', function (error) {
	// some action
});
```

* Subscribe on it using the context of [store](#stores) or
[cat-component](#cat-components) using the same `on`, `once` methods.


In a browser, you can access Catberry application instance via `window` object
```javascript
// catberry object is global because it is a property of the window
catberry.events.on('error', function (error) {
	// some action
});
```

Actually `cat.events` has interface similar with [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter).

## Event names and arguments
Here is a list of common Catberry events:

| Event					| When happens									| Arguments																									|
|-----------------------|-----------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| ready					| Catberry has finished initialization			|	no																										|
| error					| error happened								|	`Error` object																							|
| storeLoaded			| each store is loaded							|	`{name: String, path: String, constructor: Function}`													|
| componentLoaded		| each component is loaded						|	`{name: String, properties: Object, constructor: Function, template: Object, errorTemplate: Object}`	|
| allStoresLoaded		| all stores are loaded							|	Map of loaded stores by names																			|
| allComponentsLoaded	| all components are loaded						|	Map of loaded components by names																		|
| componentRender		| Catberry starts rendering component			|	`{name: String, context: Object}`																		|
| componentRendered		| Catberry finishes rendering component			|	`{name: String, context: Object, time: Number}`															|
| storeDataLoad			| Catberry starts loading data from store		|	`{name: String}`																						|
| storeDataLoaded		| Catberry finishes loading data from store		|	`{name: String, data: Object, lifetime: Number}`														|
| actionSend			| Catberry sends action to store				|	`{storeName: String, actionName: String, args: Object}`													|
| actionSent			| Action is sent to store						|	`{storeName: String, actionName: String, args: Object}`													|
| documentRendered		| Catberry finishes rendering of all components	|	Routing context with location, referrer, userAgent etc.													|
| storeChanged			| Catberry application's store is changed		|	Name of store																							|
| stateChanged			| Catberry application changed state			|	`{oldState: Object, newState: Object}`																	|

List of server-only events:

| Event				| When happens					| Arguments												|
|-------------------|-------------------------------|-------------------------------------------------------|
| storeFound		| each store is found			|	`{name: String, path: String}`						|
| componentFound	| each component is found		|	`{name: String, path: String, properties: Object}`	|
| bundleBuilt 		| browser bundle is built		|	`{time: Number, path: String}`						|

List of browser-only events:

| Event				| When happens										| Arguments								|
|-------------------|---------------------------------------------------|---------------------------------------|
| documentUpdated	| stores are changed and components are re-rendered	|	`['store1', 'store2']`				|
| componentBound	| each component is bound							|	`{element: Element, id: String}`	|
| componentUnbound	| each component is unbound							|	`{element: Element, id: String}`	|

These events can be used for browser extensions, extended logging
or component/store logic, feel free to use them everywhere you want
but remember if any event has too many subscribers it can cause
performance degradation.

**[⬆ back to top](#table-of-contents)**

# CLI

Catberry has a Command Line Interface that helps to start a new project and add
new stores and components to it.

To start using of Catberry CLI just install it globally from npm

```
npm -g install catberry-cli
```

And then follow usage instructions you can find
[here](https://github.com/catberry/catberry-cli) or just use the help of
catberry utility:

```
catberry --help
```

**[⬆ back to top](#table-of-contents)**

# Get Started
First of all you need to install [CLI](https://github.com/catberry/catberry-cli):

```bash
npm install -g catberry-cli
```

After that, you can create a project.
So, create a directory for your new project and change to the new directory.

```bash
mkdir ~/new-project
cd ~/new-project
```

Now you can initialize one of the Catberry project templates.

Please choose one:

* `example` - finished project that works with GitHub API and demonstrates
how to implement such isomorphic application using Catberry Framework
* `empty-handlebars` - empty project using [Handlebars](http://handlebarsjs.com/) template engine.
* `empty-dust` - empty project using [Dust](https://github.com/catberry/catberry-dust) template engine.
* `empty-jade` - empty project using [Jade](http://jade-lang.com/) template engine.

After you have chosen a template, please do the following:

```bash
catberry init <template>
```
Where `<template>` is a chosen name.

For example,

```bash
catberry init empty-handlebars
```

Now you have created the project structure.
Also you can see some instructions in the console that say how to install and start
the application.

You need to install dependencies:

```bash
npm install --production
```

Then you can start your application, but you can start it using two modes:

 * Debug mode – no code minification, watching files for changing and rebuilding
 * Release mode – code minification, no watching files, production-ready

To start in release mode:
```bash
npm start
```

To start in debug mode:
```bash
npm run debug
```
Or
```bash
npm run debug-win
```
if you use Windows.

The application will say to you which port it is listening on.
The address will be [http://localhost:3000](http://localhost:3000) by default.

Now you have your first Catberry application, create your own [Stores](#stores) and
[Cat-components](#cat-components).

The CLI can help you here as well.

For adding stores:
```bash
catberry addstore <store-name>
```
where `<store-name>` is a name like `some-group/Store`.

For adding cat-components:
```bash
catberry addcomp <component-name>
```
where `<component-name>` is a name like `hello-world`.

Hope now you are an expert in Catberry Framework. Enjoy it!

**[⬆ back to top](#table-of-contents)**