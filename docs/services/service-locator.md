#Service Locator

Whole architecture of Catberry framework is based on 
[Service Locator pattern](http://en.wikipedia.org/wiki/Service_locator_pattern) 
and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).

##Register own services
There is only one service locator (singleton) in one catberry application 
instance and all Catberry's components are resolved from this locator when 
you use `getMiddleware` method on server or `startWhenReady` in browser code.
Before that moment feel free to register your own services to inject it into 
catberry modules via DI.

Your Catberry application always must have server.js with code like this:
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

And client.js with code like this:
```javascript
var RestApiClient = require('./lib/RestApiClient'),
// create catberry application instance.
	catberry = require('catberry'),
	config = require('./client-config'),
	cat = catberry.create(config);

// then you could register your components to inject into catberry modules.
cat.locator.register('restApiClient', RestApiClient, config, true);

// you can register services only before this method cat.startWhenReady()
// tell catberry to start when HTML document will be ready
cat.startWhenReady();

```

Also you can override some existing registrations, for example Logger:
 
```javascript
cat.locator.register('logger', MyCoolLogger, config, true);
```

It registers one more implementation of logger. Catberry always uses last
registered implementation of every service.

You can also get access to all implementations using `resolveAll` method.

##Using Registrations via Dependency Injection

If you need to use your own or Catberry's service registered in Service Locator
you just need to inject it in module of your application.

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

When this code will be optimized (minified) for browser all these injections
will stay as is and will not be broken.

Also you can inject only `$serviceLocator` and resolve everything you want
directly.

##Interface

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