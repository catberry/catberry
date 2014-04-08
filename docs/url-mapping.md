#URL Mapping Engine

The first case when you might need URL mapping is a massive state description in URL.
As it was told in [Modules Documentation](modules.md) whole state of Catberry application should be described in URL.
All [Query String](http://en.wikipedia.org/wiki/Query_string) parameters are parameters for modules and it is obvious that it could cause problem with long and ugly URLs in your application.
The second case when you might need URL mapping engine is situation when you have some project and decide to rewrite it using Catberry framework but all old URLs should be saved.

##Usage

It is really easy to use, you just need to put "map.js" in root of your application near client.js and server.js scripts.

Example of file below:

```javascript
module.exports = [
	{
		expression: /^\/$/,
		map: function (url) {
			url.pathname += 'main';
			return url;
		}
	},
	{
		expression: /^\/chat$/i,
		map: function (url) {
			url.pathname = '/main';
			url.search = '?main_tab=chat';
			return url;
		}
	},
	{
		expression: /^\/about$/i,
		map: function (url) {
			url.pathname = '/main';
			url.search = '?main_tab=about';
			return url;
		}
	}
];
```

In fact it exports an array of mapper objects.
Every mapper object has an expression which is actually a regular expression and map function.
Regular expression is used to test URL path component.
Map function receives parsed URL object with all URL components described [here](http://nodejs.org/api/url.html#url_url) and should change URL components as it is required and return this or new object with new URL components.

**Warning**: If your current URL matches several expressions at the same time the last mapper will be taken (it is stack-organized).