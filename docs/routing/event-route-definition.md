#Event Route Definition

Catberry supports optional event route definitions in `./events.js`.

Event route definitions describe which events are handled by Catberry, 
what parameters Catberry can parse from event names and what modules will
receive event and parsed parameters.

Event could be raised in two cases:

* Changed hash in location (if you has clicked in page on link that contains 
hash in `href` attribute or if you open shared link with hash), 
in this case hash is an event string. 
Sample link element: `<a href="#event-name">Title</a>`.
Sample url: `http://yourserver.com#event-name`.
* Click on link or button (`<a>` or `<button>` element) with `data-event` 
attribute, which value is event string. Use this case if you don't want to update 
location hash. `href` attribute of link element in this will be ignored.
Sample link element: `<a href="#event-name" data-event="event-name">Title</a>`.
Sample button element: `<button data-event="event-name">Details</button>`.

When you change hash in location, modules receive two events:

* Previous event was ended (last hash is cleared)
* New event is starting (new hash is set)

When you click on link or button with `data-event` it is always "start" an 
event and never "end" of event.

##Definition or rules

There is one way to define event routing rule:

```
expressionWithParameters->eventName[module1, module2, module3]
```

`expressionWithParameters` - this is expression with colon-marked parameters
which is very similar with [URL Route Definition](url-route-definition.md) but
without list of modules receivers in it.
Before `->` it is **event string format** that can contain any parameters.
Then after `->` you should define **event name** that will be raised in module and
list of modules that will receive this event.

## Example of definition
For example, we have rule 
```
limit:count->limit[feed]
```
If this rule is defined and event or hash is `limit50` then `feed` module's 
`handle` method will be invoked with event string `limit50`, event name `limit`
 and arguments: 
```json
{
  "count": "50"
}
```

More complex example:
```
removeComment-:id-:someOther->removeComment[comments, feed, rating]
```

Let's say hash is `#removeComment-1-text`.

Modules `comments`, `feed` and `rating` will handle event with name 
`removeComment` and arguments:
```json
{
  "id": "1",
  "someOther": "text"
}
```

Please keep in mind that parameter names should satisfy regular expression
`[$A-Z_][\dA-Z_$]*` and parameter values should satisfy regular expression
`\w*`.

## File example
Here is an example of `./events.js` file with some event route definitions:

```javascript
module.exports = [
	'forget-password->forget-password[auth]',
	'limit:number->limit[orderComments]',
	'remove-:entityType-:id->remove[main]'
];
```

Read next:

* [Modules](../modules/index.md)
 
Read also:

* [URL Route Definition](url-route-definition.md)