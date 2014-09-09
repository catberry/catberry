#Render method
Every module can have `render` method like this:
```javascript
Module.prototype.render = function (placeholderName) {
	return {}; // some data context or promise for it 
};
```

Or like this:
```javascript
Module.prototype.renderPlaceholderName = function () {
	return {}; // some data context or promise for it 
};
```

For example, you have a placeholder with name `some-awesome-placeholder` and 
owner of this placeholder is module `big-paw`.
When rendering engine finds placeholder reference like 
`<div id="big-paw_some-awesome-placeholder"></div>` it tries to invoke such 
methods by priorities:

* `BigPaw.renderSomeAwesomePlaceholder()`
* `BigPaw.render('some-awesome-placeholder')`
* `function() { return Promise.resolve(); }`

As you may notice Catberry converts name of placeholder to camel case and 
build name or `render` method automatically.

Every render method should return an object as data context or Promise for it. 
`undefined` is also a proper value, it means render method can return nothing.

In browser render method is also called when module state is changed and 
need to refresh all module's placeholders.

After `render` method is successfully finished `after` method is called. For
previous example it is (by priorities):

* `BigPaw.afterRenderSomeAwesomePlaceholder()`
* `BigPaw.afterRender('some-awesome-placeholder')`
* `function() { return Promise.resolve(); }`

The main thing you should keep in mind is that method `render` is executing at
server and in browser as well. It means you can not use environment-specified
JavaScript using `window` or `process`, for example. If you need to do redirect, 
set cookie or clear hash in URL you can use 
[Module Context methods](context.md).

`after` method is called only in browser, feel free to use browser 
environment in it. The main task that is solved by `after` method is working 
with DOM after placeholder is rendered. Maybe you need to wrap some elements
with logic or subscribe on some events and so on.

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

Read next:

* [Handle Method](handle-method.md)

Read also:

* [Submit Method](submit-method.md)
* [Context](context.md)
* [URL Route Definition](../routing/url-route-definition.md)