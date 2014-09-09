#Handle method
Every module can have `handle` method like this:
```javascript
Module.prototype.handle = function (eventName, event) {
	return Promise.resolve(); // return Promise or nothing 
};
```

Or like this:
```javascript
Module.prototype.handleEventName = function (event) {
	return Promise.resolve(); // return Promise or return nothing 
};
```

This method is used to handle events specified in [Event Route Definition]
(../routing/event-route-definition.md). 

For example, you have an event with name `some-awesome-event` and 
this event should be handled in module `big-paw` then `./event.js` has 
such string:
```
some-awesome-event->some-awesome-event[big-paw]
```

When event is happened on page Catberry tries to invoke such methods 
by priorities:

* `BigPaw.handleSomeAwesomeEvent(event)`
* `BigPaw.handle('some-awesome-event', event)`
* `function() { return Promise.resolve(); }`

As you may notice Catberry converts name of event to camel case and 
build name or `handle` method automatically.

The main thing you should keep in mind is that method `handle` is executing only
in browser. It means you can not use server environment-specified
JavaScript, `process` object for example.

##Event object

For example event definition is:
```
remove-:type-:id->remove[entity-manager]
```

And we click on `button` with `data-event="remove-comment-42"`. 

In this case such event object will be passed to handle method of module 
`entity-manager`:
```javascript
{
	string: 'remove-comment-42', // the same is in data-event attribute  
	isEnding: false, // if we clear or change hash this value is true
	isHashChanging: false, // we just push button and did not change hash 
	element: $(), // button element wrapped by jQuery
	eventName: 'remove',
	args: {
		type: 'comment',
		id: '42'
	}
}
```

##Two event types
There are two different types of events:

* Moment events: happened only with `isEnding = false` and the source of event 
is click on link or button with attribute `data-event`.
* Continuous event: happened with `isEnding = false` when it starts and 
`isEnding = true` when it ends and always has `isHashChanging = true`. 
Such events are happened when hash in location is changed to event expression 
routed by [Event Route Definition](../routing/event-route-definition.md).

Name of event, arguments are also defined by [Event Route Definition]
(../routing/event-route-definition.md).

Read next:

* [Submit Method](submit-method.md)

Read also:

* [Placeholders](placeholders.md)
* [Render Method](render-method.md)
* [Context](context.md)
* [Event Route Definition](../routing/event-route-definition.md)