#Template Provider

Catberry has a template provider service registered as "templateProvider" in 
[Service Locator](../service-locator.md) and accessible via 
[dependency injection](../dependency-injection.md).

If you in situation when it is needed to render placeholder or partial 
dynamically, maybe for lazy loading or anything else, you can render template
manually and not using Catberry rendering system.

Just inject `$templateProvider` into your module or resolve it from 
Service Locator to use this service.

The only method you need to do that is `getStream` and pass full 
template name (moduleName_placeholderName) to it as first argument 
and data context as second.

Keep in mind that you can use this service only in browser and direct usage of
this service is highly **not recommended**.

##Interface
```javascript
/**
 * Gets stream of specified template for rendering specified data.
 * @param {string} name Template name.
 * @param {Object} context Data context.
 * @returns {Stream} Rendering stream.
 */
TemplateProvider.prototype.getStream = function (name, context) { }
```

Read also:

* [Logger](logger.md)
* [Config](config.md)
* [jQuery](jquery.md)
* [Universal HTTP(S) Request](universal-http-request.md)