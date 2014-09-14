#Catberry Framework Documentation

![Catberry](images/logo.png) 

* [Isomorphic Applications](#isomorphic-applications)
* [Introducing Catberry](#introducing-catberry)
* [Service-Module-Placeholder](#service-module-placeholder)
* [Catberry Services](#catberry-services)
	* [Service Locator](#service-locator)
	* [Dependency Injection](#dependency-injection)
	* Userland Catberry Services
		* [Logger](#logger)
        * [Config](#config)
        * [jQuery](#jquery)
        * [Universal HTTP(S) Request](#uhr-universal-https-request)
        * [Dust](#dust)
* [Routing](#routing)
	* [URL Route Definition](#url-route-definition)
	* [Event Route Definition](#event-route-definition)
* [Modules](#modules)
	* [Placeholders](#placeholders)
	* [Render Method](#render-method)
	* [Handle Method](#handle-method)
	* [Submit Method](#submit-method)
	* [Context](#context)
* [Building Browser Bundle](#building-browser-bundle) 
* [Event Bus and Diagnostics](#event-bus-and-diagnostics) 
* [CLI](#cli) 
* [Code Style Guide](#code-style-guide)

#Isomorphic Applications

Make a long story short, isomorphic applications are built to make it possible 
to write module once and use it for both page rendering on server 
(for SEO and some shared links) and in browser with no server side at all.
It means on server your modules are executing the same code as 
in browser. This [Single Page Application]
(http://en.wikipedia.org/wiki/Single_Page_Application) 
can re-render all parts of the page using the same isomorphic modules and not 
reloading the page at all.

There is an awesome [post in airbnb technical blog]
(http://nerds.airbnb.com/isomorphic-javascript-future-web-apps/) 
about the idea of isomorphic JavaScript applications and what exactly it is.
Also you can find video [Spike Brehm: Building Isomorphic Apps]
(http://www.youtube.com/watch?v=CH6icJbLhlI)
from JSConf 2014 talks.

Isomorphic applications can work with set of independent services that 
implement some business logic (Facebook API, Twitter API, your API etc).
In fact, each module in isomorphic application should receive all data from 
API server which could be written in any platform you want using REST approach.

There is a list of problems which are solved by isomorphic applications:

* *Using single page applications causes SEO problems*. Your isomorphic
modules will render exactly the same page on server as it is in browser
* *Code duplication for rendering parts of the page at server and in browser, 
sometimes it even written in different programming languages*. 
Since isomorphic modules are written only once and in JavaScript 
you do not have this problem.
* *Maintenance is complicated, because you need to synchronize changes 
in server-side and browser modules*. Obviously, you do not need this
using isomorphic modules. It is always one module to change.
* *Overhead connected with rendering all pages on server*. Since browsers 
receive a page from server only once and then render all other pages in 
their browsers your server's load will be reduced dramatically.
 
And maybe a lot of more, who knows.

Technologies like History API and node.js make this type 
of applications possible and we should use this possibility.  

#Introducing Catberry

Catberry is a framework for [Isomorphic Applications]
(#isomorphic-applications). Also it is a [connect]
(https://github.com/senchalabs/connect)/[express]
(https://github.com/visionmedia/express) middleware.

It makes possible to write modules that on the one hand will be used for 
rendering at the server side for SEO purposes and shared links, 
and on the other hand for rendering in browser for [Single Page Application]
(http://en.wikipedia.org/wiki/Single_Page_Application).

A lot of features are also described in [read me](../README.md) file and 
there is a list of most important advantages which your isomorphic application 
receives using Catberry:

* Server-side rendering is stream-based, it means user will see a page
immediately and do not need to wait until all API requests will be finished
* Application consists of independent modules. Page consists of placeholders and 
each module controls a group of such placeholders. 
Make and combine placeholders in modules as you want
* Every placeholder is a [dustjs](https://github.com/linkedin/dustjs) template 
with all advantages of this streaming template engine 
* Routing engine supports parsing of parameters from URLs and map it 
to state object in the module. URL and state are automatically synchronized 
in browser and at server as well
* Caching data that was rendered in placeholders
* Every module can set cookies, do HTTP(S) requests, redirect to another 
location in the same way as at server as in browser
* Every module can handle link clicks and hash changes with passing arguments 
in a very simple way
* Every module can receive submitted form and, for example, pass its data to API
* Whole module API is built using [promises](https://www.promisejs.org/). 
Promise is a main approach for working with asynchronous operations in Catberry
application.

#Service-Module-Placeholder

Catberry proposes to use [Service-Oriented Architecture]
(http://en.wikipedia.org/wiki/Service-Oriented_Architecture) where every module 
can work with set of independent services (or one service) that implement 
some business logic.

So, Catberry Application consist of:

 * Set of services (that implements business logic or uses third-party APIs)
 * Set of modules (more details in [Modules section](#modules))
 * Set of placeholders (templates) that can reference each other 
 (more details in [Placeholders section](#placeholders))

Typical architecture in common case is presented in image below:

![Catberry Application Architecture](images/smp.png)

You can find example application
[here](https://github.com/catberry/catberry-cli/tree/master/templates/example)
with architecture that is described below:

![Example Application Architecture](images/smp-example.png)

This approach allows your module to be executed at server and in browser as well 
without any additional logic written by you. All you need is to use 
[Universal HTTP(S) Request](#uhr-universal-https-request) - 
this component implements HTTP(S) request logic using `XmlHttpRequest` 
in browser and `http.request` at server and has the same interface.

#Catberry Services

In Catberry all framework components such as Logger or 
Universal HTTP(S) Request are called as services. 

Whole Catberry architecture is built using [Service Locator]
(http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and 
[Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).
Service Locator is a Catberry core component that knows every other Catberry 
component. All these components can ask Service Locator to get instance
of some other component. For example, every component and even userland 
catberry module can ask for a Logger to log messages to console.

When Catberry initializes itself it fills Service Locator with own set of
components, but framework users can also register own components and even
replace implementation of some Catberry components. For example, you can replace
Logger service in Locator with your own logger which sends messages 
to Graylog (or any other).
 
To register your own components you should keep in mind that 
you probably need different implementations of your component for server and browser 
if it depends on the environment.

Learn more how to use Service Locator in next section.

##Service Locator

Whole architecture of Catberry framework is based on 
[Service Locator pattern](http://en.wikipedia.org/wiki/Service_locator_pattern) 
and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).

###Register Own Services
There is only one service locator (singleton) in one catberry application 
instance and all Catberry's components are resolved from this locator when 
you use `getMiddleware` method on server or `startWhenReady` in browser code.
Before that, feel free to register your own services to inject it into 
catberry modules via DI.

Your Catberry application must have `./server.js` with code like this:
```javascript
var catberry = require('catberry'),
	RestApiClient = require('./lib/RestApiClient'),
	connect = require('connect'),
	config = require('./server-config'),
	cat = catberry.create(config),
	app = connect();

// when you have created instance of Catberry application
// you can register in Service Locator everything you want.
cat.locator.register('restApiClient', RestApiClient, config, true);

// you can register services only before this method cat.getMiddleware()
app.use(cat.getMiddleware());
app.use(connect.errorHandler());
http
	.createServer(app)
	.listen(config.server.port || 3000);

```

And `./browser.js` with code like this:
```javascript
var RestApiClient = require('./lib/RestApiClient'),
// create catberry application instance.
	catberry = require('catberry'),
	config = require('./browser-config'),
	cat = catberry.create(config);

// then you could register your components to inject into catberry modules.
cat.locator.register('restApiClient', RestApiClient, config, true);

// you can register services only before this method cat.startWhenReady()
// tell catberry to start when HTML document will be ready
cat.startWhenReady(); // returns promise

```

Also you can override some existing registrations, for example Logger:
 
```javascript
cat.locator.register('logger', MyCoolLogger, config, true);
```

It registers one more implementation of logger. Catberry always uses last
registered implementation of every service.

You can also get access to all implementations using `resolveAll` method.

How to use registered service please read 
in [Dependency Injection](#dependency-injection) section.

###Interface

Catberry's Service Locator implementation has following methods:

```javascript
/**
 * Registers new type in service locator.
 * @param {string} type Type name, which will be an alias in other constructors.
 * @param {Function} constructor Constructor which
 * initializes instance of specified type.
 * @param {Object?} parameters Set of named parameters
 * which will be also injected.
 * @param {boolean?} isSingleton If true every resolve will return
 * the same instance.
 */
ServiceLocator.prototype.register = function (type, constructor, parameters, isSingleton){ }

/**
 * Registers single instance for specified type.
 * @param {string} type Type name.
 * @param {Object} instance Instance to register.
 */
ServiceLocator.prototype.registerInstance = function (type, instance) { }

/**
 * Resolves last registered implementation by type name
 * including all its dependencies recursively.
 * @param {string} type Type name.
 * @returns {Object} Instance of specified type.
 */
ServiceLocator.prototype.resolve = function (type) { }

/**
 * Resolves all registered implementations by type name
 * including all dependencies recursively.
 * @param {string} type Type name.
 * @returns {Array} Array of instances specified type.
 */
ServiceLocator.prototype.resolveAll = function (type) { }

/**
 * Resolves instance of specified constructor including dependencies.
 * @param {Function} constructor Constructor for instance creation.
 * @param {Object?} parameters Set of its parameters values.
 * @returns {Object} Instance of specified constructor.
 */
ServiceLocator.prototype.resolveInstance = function (constructor, parameters) { }

/**
 * Unregisters all registrations of specified type.
 * @param {string} type Type name.
 */
ServiceLocator.prototype.unregister = function (type) { }
```

##Dependency Injection

If you need to use your own or Catberry's service registered in Service Locator
you just should inject it in module of your application.

For example, you have module called AwesomeModule. In Catberry every module is 
a constructor with prototype. To inject Logger, your own RestApiClient and 
someConfigKey from config object you just need to specify such constructor in 
your module:

```javascript
function AwesomeModule($logger, $restApiClient, someConfigKey) {
	// here logger and restApiClient are instances will be accessible
	// via dependency injection from service locator
	// someConfigKey will be accessible from startup config object
	// via dependency injection too
}
```

In release mode this code will be optimized (minified) for browser, 
but all these injections will stay as is and will not be broken.

Also you can inject only `$serviceLocator` and resolve everything you want
directly.

It is really important not to make loops in resolving dependencies. It causes
infinite recursion and just kill your application.

Read also:

Userland Services

* [Logger](#logger)
* [Config](#config)
* [jQuery](#jquery)
* [Universal HTTP(S) Request](#uhr-universal-https-request)
* [Dust](#dust)

##Logger

Catberry has an universal logger service registered as "logger" in 
[Service Locator](#service-locator) and accessible via 
[dependency injection](#dependency-injection).

Just inject `$logger` into your module or resolve it from 
Service Locator to use this service.

This logger implementation has standard for all loggers methods 
{trace, warn, info, error, fatal}. 
Last two supports Error object to be passed as an argument.

Actually when you use this service at server it uses 
[log4js](https://www.npmjs.org/package/log4js) module inside. 
It means you can configure it as described [here]
(https://github.com/nomiddlename/log4js-node) in its README file.

In browser it is implemented as a very simple logger that can only write 
to browser's console.

###Configuration
To configure browser logger you should just set parameter object `logger` in 
Catberry config object.

Like this for browser logger:
```json
{
	"logger": {
		"levels": "warn,error"
	}
}
```

To configure server logger you have to do more actions:
```javascript
var log4js = require('log4js'); 
//console log is loaded by default, so you won't normally need to do this
//log4js.loadAppender('console');
log4js.loadAppender('file');
//log4js.addAppender(log4js.appenders.console());
log4js.addAppender(log4js.appenders.file('logs/cheese.log'), 'cheese');

var logger = cat.locator.resolve('logger');
logger.setLevel('ERROR');
```

More details [here](https://github.com/nomiddlename/log4js-node#usage).

###Interface

* Browser: [./lib/client/Logger.js](../../../browser/Logger.js)
* Server: [log4js](https://www.npmjs.org/package/log4js)

##Config

Catberry has a config service registered as "config" in 
[Service Locator](#service-locator) and accessible via 
[dependency injection](#dependency-injection).

Just inject `$config` into your module or resolve it from 
Service Locator to use this service.

This service is just a full config file which was passed to `catberry.create()`
method.

##jQuery

Catberry has jQuery service registered as "jQuery" in 
[Service Locator](#service-locator) and accessible via 
[dependency injection](#dependency-injection).

Just inject `$jQuery` into your module or resolve it from 
Service Locator to use this service.

This popular library is used for DOM manipulation in Catberry's browser modules.
But it also can be used in your own modules.

All details about usage you can read in jQuery official documentation [here]
(http://api.jquery.com).

Please keep in mind that you can resolve jQuery at server and in browser,
but actually it can be used only in browser where `window` object is defined.

##UHR (Universal HTTP(S) Request)

Catberry has Universal HTTP(S) Request service registered as "uhr" in 
[Service Locator](#service-locator) and accessible via 
[dependency injection](#dependency-injection).

All details about usage you can read in UHR read me file [here]
(https://github.com/catberry/catberry-uhr/blob/master/README.md).

##Dust

Catberry has dustjs template engine service registered as "dust" in 
[Service Locator](#service-locator) and accessible via 
[dependency injection](#dependency-injection).

Just inject `$dust` into your module or resolve it from 
Service Locator to use this service.

Catberry uses [dustjs](https://github.com/linkedin/dustjs) template engine
for placeholder rendering and if you need to add some 
[filters](https://github.com/linkedin/dustjs/wiki/Dust-Tutorial#more-on-dust-output-and-dust-filters) 
or [helpers](https://github.com/linkedin/dustjs/wiki/Dust-Tutorial#writing-a-dust-helper) 
in it you can inject it to main module and do everything you need.

#Routing

Catberry has two routing subsystems:

* URL routing system: routes all URL changes and map URL arguments 
to states of modules. All rules must be defined in `./routes.js`
* Event routing system: routes all page hash changes or `data-event` 
attributes of links in page. Invokes handle methods of all modules-receivers. 
All rules must be defined in `./events.js`.

If your application does not have routing rules, your modules can not render
page blocks and handle any events from page.

All details about definition of route rules are described in next sections.

##URL Route Definition

Catberry requires route definitions in `./routes.js`.

Route definition is a rule that describes which URLs are handled by Catberry,
what parameters Catberry can parse from these URLs and what modules will 
receive parsed parameters.
 
### Colon-marked parameters definition

Default definition syntax is following:

```
/some/:id[module1,module2]/actions?someParameter=:parameter[module1]
```

All parameters must be marked with colon at start and followed by list of 
module names that will receive value of this parameter to its state object.

In previous example `id` value will be set to state of modules 
`module1`, `module2`; and `parameter` value will be set only to state of module
`module1`.

Please keep in mind that parameter **name** in route definition should satisfy
regular expression `[$A-Z_][\dA-Z_$]*` and parameter **value** should satisfy
regular expression `[^\/\\&\?=]*`.

### Colon-marked parameters with additional `map` function

Also you can define mapper object, that allows you to modify state object before 
it will be processed by modules.

For such definition just use object like this:

```javascript
{
	expression: '/user/news/:category[news]',
	map: function(state) {
		state.news.pageType = 'userNews';
		return state;
	}
}

```
Map function receives state prepared by expression rule. State is an object 
where keys are names of receiver modules and values are state objects for every 
module receiver. You can change whole state object if you want and return it
from map function.

In this example module `news` will receive additional state parameter `pageType`
with value `userNews`.

### Regular expression
For some rare cases you may need to parse parameters by yourself using regular
expressions. In these cases you can define mapper object as listed below:

```javascript
{
	expression: /^\/orders\/\d+/i,
	map: function(urlPath) {
		var matches = urlPath.match(/^\/orders\/(\d+)/i);
		return {
			order:{
				orderId: Number(matches[1])
			}
		};
	}
}
```

In this example module `order` will receive parameter `orderId` with value
matched with number in URL.

### File example
Here is example of `./routes.js` file with all 3 cases of route definition:

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
##Event Route Definition

Catberry supports optional event route definitions in `./events.js`.

Event route definitions describe which events are handled by Catberry, 
what parameters Catberry can parse from event names and what modules will
receive event and parsed parameters.

Event could be raised in two cases:

* Changed hash in location (if you has clicked in page on link that contains 
hash in `href` attribute or if you open shared link with hash), 
in this case hash is an event string. 
Sample link element: `<a href="#event-name">Title</a>`.
Sample url: `http://yourserver.com#event-name`.
* Click on link or button (`<a>` or `<button>` element) with `data-event` 
attribute, which value is event string. Use this case if you don't want to update 
location hash. `href` attribute of link element in this will be ignored.
Sample link element: `<a href="#event-name" data-event="event-name">Title</a>`.
Sample button element: `<button data-event="event-name">Details</button>`.

When you change hash in location, modules receive two events:

* Previous event was ended (last hash is cleared)
* New event is starting (new hash is set)

When you click on link or button with `data-event` it is always "start" an 
event and never "end" of event.

###Definition or rules

There is one way to define event routing rule:

```
expressionWithParameters->eventName[module1, module2, module3]
```

`expressionWithParameters` - this is expression with colon-marked parameters
which is very similar with [URL Route Definition](#url-route-definition) but
without list of modules receivers in it.
Before `->` it is **event string format** that can contain any parameters.
Then after `->` you should define **event name** that will be raised in module and
list of modules that will receive this event.

### Example of definition
For example, we have rule 
```
limit:count->limit[feed]
```
If this rule is defined and event or hash is `limit50` then `feed` module's 
`handle` method will be invoked with event string `limit50`, event name `limit`
 and arguments: 
```json
{
  "count": "50"
}
```

More complex example:
```
removeComment-:id-:someOther->removeComment[comments, feed, rating]
```

Let's say hash is `#removeComment-1-text`.

Modules `comments`, `feed` and `rating` will handle event with name 
`removeComment` and arguments:
```json
{
  "id": "1",
  "someOther": "text"
}
```

Please keep in mind that parameter names should satisfy regular expression
`[$A-Z_][\dA-Z_$]*` and parameter values should satisfy regular expression
`\w*`.

### File example
Here is an example of `./events.js` file with some event route definitions:

```javascript
module.exports = [
	'forget-password->forget-password[auth]',
	'limit:number->limit[orderComments]',
	'remove-:entityType-:id->remove[main]'
];
```

