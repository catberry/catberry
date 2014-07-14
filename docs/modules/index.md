#Modules

Modules are building blocks of web-application using Catberry framework.
Usually modules are placed in `/catberry_modules` folder. Or you can override it
if set `modulesFolder` parameter in Catberry config.

##How to add modules
There are some rules how to add modules to your application:

* It always should be module `main` and its placeholder `__index.dust' with
 template of whole application page (html, head, body etc)
* In fact every module is a folder, name of folder is a name of module
* Module can optionally have a logic (can just has templates), if so 
it should have `index.js` that exports module constructor
* Module can optionally have placeholders, if so it should have `placeholders`
folder inside with [dustjs](https://github.com/linkedin/dustjs)) templates.
Placeholders can be placed in sub-folders but with unique names

Please keep in mind that module name (folder name) should satisfy regular 
expression `^\w+$`.

##Module context
Every module instance always has `$context` property which is assigned by
Catberry when module initializes. Catberry updates `$context` every time the 
state of application is changed. 

At server Catberry creates new instance of module for every incoming 
request (but call constructor only once) therefore `$context` object is different
for every incoming HTTP request and represents URL parameters.

In browser Catberry creates module once and create `$context` at the same time.
Then just update state of `$context` every time user clicks link with URLs
inside the application.

##ModuleBase
Also it can be very useful to inherit you module from [catberry-module]
(https://www.npmjs.org/package/catberry-module). It is a base module 
implementation with "smart method invocation" that reduce all this code that
should decide what logic to execute by placeholder, event or form name.

##Example of application structure
Typically folder structure of your application should look like this:
```
catberry_modules/
	main/
		placeholders/
			__index.dust # root placeholder (page template)
			__error.dust # error placeholder to replace errors in release mode
			placeholder1.dust
			placeholder2.dust
			...
			placeholderN.dust
		MainModule # main module implementation
		index.js # just module.exports = require('./MainModule');
	module1/
		placeholders/
			__error.dust # error placeholder to replace errors in release mode
			placeholder1.dust
			placeholder2.dust
			...
			placeholderN.dust
		ModuleConstructor # module implementation
		index.js # just module.exports = require('./ModuleConstructor');
	...
	moduleN/
lib/ # folder for your own external non-catberry components/services
public/ # this folder is default destination for browser bundle building
client.js # browser initial script
server.js # connect server start script
routes.js # definition of URL route definitions
events.js # definition of event route definitions
```

If you want to see finished application as an example then please proceed to 
[example](../../example) folder.

Read also:

* [Placeholders](placeholders.md)
* [Render Method](render-method.md)
* [Handle Method](handle-method.md)
* [Submit Method](submit-method.md)
* [Context](context.md)
