#Event Route Definition

Catberry supports optional event route definitions in `/events.js`.

Event route definitions describe which events are handled by Catberry 
what parameters Catberry can parse from event names and what modules will
receive event and parsed parameters.

Event could be raised in two cases:
* Change of hash in location, in this case hash is an event name
* Click on link (`<a>` element) with `data-event` attribute, which value
is event name

When you change hash in location modules receive two events:
* Previous event was ended (last hash is cleared)
* New event is starting (new hash is set)

When you click on link with `data-event` it is always "start" of event and never
"end" of event.

##Definition or rules

There is one way to define event routing rule:

```
expressionWithParameters->eventName[module1, module2, module3]
```

`expressionWithParameters` - this is expression with colon-marked parameters
which is very similar with [URL Route Definition](url-route-definition.md) but
without list of modules receivers in it.

Then after `->` you must define event name that will be raised in module and
list of modules that will receive this event.

## Example of definition
For example, we have rule 
```
limit:count->limit[feed]
```
If this rule is defined and event or hash is `limit50` then `feed` module's 
`handle` method will be invoked with event name `limit` and arguments: 
```json
{
  "count": "50"
}
```

More complex example:
```
removeComment-:id-:someOther->removeComment[comments, feed, rating]
```

Let's say hash is `removeComment-1-text`.

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
Here is example of `/events.js` file with some event route definitions:

```javascript
module.exports = [
	'forget-password->forget-password[auth]',
	'limit:number->limit[orderComments]',
	'remove-:entityType-:id->remove[main]'
];
```

Read also:
 
 * [URL Route Definition](url-route-definition.md)