#Dependency Injection

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

* [Logger](userland/logger.md)
* [Config](userland/config.md)
* [jQuery](userland/jquery.md)
* [Template Provider](userland/template-provider.md)
* [Universal HTTP(S) Request](userland/universal-http-request.md)

Read next:

* [Routing](../routing/index.md)