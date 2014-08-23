#jQuery

Catberry has a config service registered as "config" in 
[Service Locator](../service-locator.md) and accessible via 
[dependency injection](../dependency-injection.md).

Just inject `$config` into your module or resolve it from 
Service Locator to use this service.

This service is just a full config file which was passed to `catberry.create()`
method.

Read also:

* [Logger](logger.md)
* [jQuery](jquery.md)
* [Universal HTTP(S) Request](universal-http-request.md)