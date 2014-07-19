#URL Route Definition

Catberry requires route definitions in `/routes.js`.

Route definition is a rule that describes which URLs are handled by Catberry,
what parameters Catberry can parse from these URLs and what modules will 
receive parsed parameters.
 
## Colon-marked parameters definition

Default definition syntax is following:

```
/some/:id[module1,module2]/actions?someParameter=:parameter[module1]
```

All parameters must be marked with colon at start and followed by list of 
module names that will receive value of this parameter to its state object.

In previous example `id` value will be set to state of modules 
`module1`, `module2`; and `parameter` value will be set only to state of module
`module1`.

Please keep in mind that parameter **name** in route definition should satisfy
regular expression `[$A-Z_][\dA-Z_$]*` and parameter **value** should satisfy
regular expression `[^\/\\&\?=]*`.

## Colon-marked parameters with additional `map` function

Also you can define mapper object, that allows you to modify state object before 
it will be processed by modules.

For such definition just use object like this:

```javascript
{
	expression: '/user/news/:category[news]',
	map: function(state) {
		state.news.pageType = 'userNews';
		return state;
	}
}

```
Map function receives state prepared by expression rule. State is an object 
where keys are names of receiver modules and values are state objects for every 
module receiver. You can change whole state object if you want and return it
from map function.

In this example module `news` will receive additional state parameter `pageType`
with value `userNews`.

## Regular expression
For some rare cases you may need to parse parameters by yourself using regular
expressions. In these cases you can define mapper object as listed below:

```javascript
{
	expression: /^\/orders\/\d+/i,
	map: function(urlPath) {
		var matches = urlPath.match(/^\/orders\/(\d+)/i);
		return {
			order:{
				orderId: Number(matches[1])
			}
		};
	}
}
```

In this example module `order` will receive parameter `orderId` with value
matched with number in URL.

## File example
Here is example of `/routes.js` file with all 3 cases of route definition:

```javascript
module.exports = [
	'/user/:id[user,menu,notifications]',
	{
		expression: '/user/news/:category[news]',
		map: function(state) {
			state.news.pageType = 'userNews';
			return state;
		}
	},
	{
		expression: /^\/orders\/\d+/i,
		map: function(urlPath) {
			var matches = urlPath.match(/^\/orders\/(\d+)/i);
			return {
				orderId: Number(matches[1])
			};
		}
	}
];
```

Read next:
 
* [Event Route Definition](event-route-definition.md)