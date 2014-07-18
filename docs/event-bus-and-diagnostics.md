#Event Bus and Diagnostics

Catberry has a set of events that can be used for diagnostics and userland
module development. Actually in Catberry it is used for logging all trace, info
and error messages.

There are two ways for listening to Catberry events:

* Subscribe on it using [module context](modules/context.md)
* Subscribe on it using Catberry application instance directly like this

```javascript
var catberry = require('catberry'),
	cat = catberry.create();

cat.API.on('error', function (error) {
	// some action
});
```

And browser you can access Catberry application instance via `window` object
```javascript
// catberry object is global because it is a property of window
catberry.API.on('error', function (error) {
	// some action
});
```

Actually `cat.API` has almost the same interface as [module context]
(modules/context.md).

##Event names and arguments

Here is a list of common Catberry events:

| Event					| When happens															| Arguments																											|
|-----------------------|-----------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| ready					| Catberry finishes initialization										|	no																												|
| error					| Error is happened														|	`Error` object																									|
| moduleLoaded			| each module is loaded													|	Module name as string																							|
| placeholderLoaded		| each placeholder is loaded											|	`{name: String, moduleName: String}`																			|
| allModulesLoaded		| all modules are loaded												|	no																												|
| templateRegistered	| template of placeholder is registered									|	`{name: String, source: String}`																				|
| placeholderRender		| Catberry starts rendering placeholder									|	`{name: String, moduleName: String, element: jQuery, context: `[Context](modules/context.md)`}`					|
| placeholderRendered	| Catberry finishes rendering placeholder								|	`{name: String, moduleName: String, element: jQuery, context: `[Context](modules/context.md)`, time: Number}`	|
| pageRendered			| Catberry finishes rendering of all placeholders after state changing	|	`{name: String, moduleName: String, element: jQuery, context: `[Context](modules/context.md)`}`					|

Next list of only-server events:

| Event				| When happens					| Arguments							|
|-------------------|-------------------------------|-----------------------------------|
| moduleFound		| each module is found			|	`{name: String, path: String}`	|
| placeholderFound	| each placeholder is found		|	`{name: String, path: String}`	|
| bundleBuilt 		| browser bundle is built		|	Path to bundle file as string	|

And list of only-browser events:

| Event				| When happens																| Arguments																				|
|-------------------|---------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| eventRegistered	| event definition is registered											|	`{eventName: String, moduleNames: Array<String>, expression: RegExp}`				|
| eventRouted		| Catberry finishes invocation of all handle methods subscribed on event	|	`{moduleNames: Array<String>, eventName: String, isStarted: Boolean, args: Object}`	|
| formSubmitted		| Catberry finishes invocation of submit method for any form on page		|	`{element: jQuery, name: String, moduleName: String, values: Object}`				|
| renderRequested	| some module requests refresh of any placeholder							|	`{placeholderName: String, moduleName: String}`										|

This events can be used for browser extensions, extended logging or module 
logic, feel free to use them everywhere you want but remember if any event has 
too many subscribers it can cause performance decrease.

Read next:

* [Code Style Guide](code-style-guide.md)

Read also:
 
* [Module Context](modules/context.md)