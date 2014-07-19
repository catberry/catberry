#jQuery

Catberry has jQuery service registered as "jQuery" in 
[Service Locator](../service-locator.md) and accessible via 
[dependency injection](../dependency-injection.md).

Just inject `$jQuery` into your module or resolve it from 
Service Locator to use this service.

This popular library uses for DOM manipulation in Catberry's browser modules.
But it also can be used in your own modules.

All details about usage you can read in jQuery official documentation [here]
(http://api.jquery.com).

Please keep in mind that you can resolve jQuery at server and in browser,
but actually it can be used only in browser where `window` object is defined.

Read also:

* [Logger](logger.md)
* [Config](config.md)
* [Template Provider](template-provider.md)
* [Universal HTTP(S) Request](universal-http-request.md)