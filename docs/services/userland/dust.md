#Dust

Catberry has dustjs template engine service registered as "dust" in 
[Service Locator](../service-locator.md) and accessible via 
[dependency injection](../dependency-injection.md).

Just inject `$dust` into your module or resolve it from 
Service Locator to use this service.

Catberry uses [dustjs](https://github.com/linkedin/dustjs) template engine
for placeholder rendering and if you need to add some 
[filters](https://github.com/linkedin/dustjs/wiki/Dust-Tutorial#more-on-dust-output-and-dust-filters) 
or [helpers](https://github.com/linkedin/dustjs/wiki/Dust-Tutorial#writing-a-dust-helper) 
in it you can inject it to main module and do everything you need.

Read also:

* [Logger](logger.md)
* [Config](config.md)
* [jQuery](jquery.md)
* [Universal HTTP(S) Request](universal-http-request.md)