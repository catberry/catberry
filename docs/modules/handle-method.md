#Handle method
Every module should have `handle` method like this:
```javascript
Module.prototype.handle = function (eventName, isStarted, args, callback) {
	callback(null, function () {
		// some actions after all modules have handled event
	}); 
};
```

This method is used to handle events specified in [Event Route Definition]
(../routing/event-route-definition.md). 

The main thing you should keep in mind is that method `handle` is executing only
in browser. It means you can not use server environment-specified
JavaScript, `process` object for example.

There are two different types of events:

* Moment events: happened only with `isStarted = true` and the source of event 
is click on link with attribute `data-event`.
* Continuous event: happened with `isStarted = true` when it starts and 
`isStarted = false` when it ends. Such events are happened when hash in location
is changed to event expression routed by [Event Route Definition]
(../routing/event-route-definition.md).

Name of event, arguments are also defined by [Event Route Definition]
(../routing/event-route-definition.md).

Callback supports two arguments. First is an `Error` object if your event 
handling logic can not finish with success and `then` function that will be 
called after event will be handled by all modules-receivers.

If you do not want to code ugly `switch` statements for event name 
to determine what logic module should use to handle event, you can use
[catberry-module](https://www.npmjs.org/package/catberry-module) with smart 
method calling to avoid that.

Read also:

* [Placeholders](placeholders.md)
* [Render Method](render-method.md)
* [Submit Method](submit-method.md)
* [Context](context.md)
* [Event Route Definition](../routing/event-route-definition.md)