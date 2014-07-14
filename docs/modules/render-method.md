#Render method
Every module should have `render` method like this:
```javascript
Module.prototype.render = function (placeholderName, callback) {
	callback(null, {some: 'data'}, function () {
		// some actions after rendering
	}); 
};
```
During rendering process if parser finds placeholder reference it calls method
`render` of module which is owner of this placeholder. The main task of this
method is to prepare data context for template that represents the placeholder.

In browser it is also called when module state is changed and need to refresh
all module's placeholders.

The main thing you should keep in mind is that method `render` is executing at
server and in browser as well. It means you can not use environment-specified
JavaScript using `window` or `process`, for example. If you need to do redirect, 
set cookie or clear hash in URL you can use 
[Module Context methods](context.md).

If you have an error during render method `Error` object should be passed 
to callback as first argument. Passed error causes stack trace print instead 
placeholder template in debug mode or `__error` placeholder rendering in 
release mode (or nothing if `_error` does not exist).

By default rendering works in debug mode, to switch it to release mode,
please pass `isRelease: true` parameter in config of Catberry application like
this:

```javascript
var catberry = require('catberry'),
	cat = catberry.create({isRelease: true}),
```

Second callback argument is a data context for template engine. 

Third callback argument is a `then` function - action that should be called 
after placeholder rendering is finished. It is very useful in browser when you
need to attach JavaScript logic to rendered HTML elements. For this you can
check if code is executing in browser 
using [Module Context methods](context.md).

If you do not want to code ugly `switch` statements for placeholder name 
to determine what logic module should use to prepare data context, you can use
[catberry-module](https://www.npmjs.org/package/catberry-module) with smart 
method calling to avoid that.

Read also:

* [Handle Method](handle-method.md)
* [Submit Method](submit-method.md)
* [Context](context.md)
* [URL Route Definition](../routing/url-route-definition.md)