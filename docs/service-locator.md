#Service Locator

##Description

Whole architecture of Catberry framework is based on [Service Locator pattern](http://en.wikipedia.org/wiki/Service_locator_pattern) and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).
It means there is only one service locator in one catberry application and all modules are resolved from this locator when you use "getMiddleware" method on server or "startWhenReady" in browser code.
Before that moment feel free to register your own modules-services to inject it into catberry modules via DI.

In Catberry, definition of type is just a string which used like a argument name in constructors following '$' char.

If your catberry module's constructor will be like following

```javascript
function Constructor($logger, $uhr, someConfigValue) {
	// here logger and uhr instances will be accessible
	// via dependency injection from service locator
	// someConfigValue will be accessible from startup config object
	// via dependency injection too
}
```

Catberry's Service Locator implementation has following methods:

```javascript
/**
 * Registers new type in service locator.
 * @param {string} type Type name, which will be alias in other constructors.
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

##Example

Using in "client.js" script:

```javascript
var ChatServiceClient = require('./lib/ChatServiceClient'),
// create catberry application instance.
	catberry = require('catberry'),
	config = require('./config'),
	app = catberry.create(config);

// then you could register your external modules to inject into catberry modules.
app.locator.register('chatServiceClient', ChatServiceClient, config, true);

// tell catberry to start when HTML document will be ready
app.startWhenReady();
```

Using in "server.js" script:

```javascript
var ChatServiceClient = require('./lib/ChatServiceClient'),
	ChatService = require('./lib/ChatService'),
	catberry = require('catberry');

// if we want to start catberry application using connect
var http = require('http'),
	path = require('path'),
	publicPath = path.join(__dirname, 'public'),
	connect = require('connect'),
	config = require('./config'),
// create instance of catberry application and pass config to it
	cat = catberry.create(config),
	app = connect();

// then you could register your external modules to inject into catberry modules.
cat.locator.register('chatServiceClient', ChatServiceClient, config, true);

app.use(connect.cookieParser());
app.use(connect.session({secret: 'meow'}));

// set our chat service as connect middleware
var chat = cat.locator.resolveInstance(ChatService, config);
app.use(chat.middleware());

// and use catberry as connect/express middleware too
app.use(cat.getMiddleware());

// all non-handled requests by catberry will be passed to next middleware
// like static files
app.use(connect.static(publicPath));
app.use(connect.errorHandler());
http
	.createServer(app)
	.listen(3000);

```