#Modules

Modules are building blocks of web-application using Catberry framework.
Usually modules are placed in `/catberry_modules` directory. Or you can override it
if set `modulesFolder` parameter in Catberry config.

##How to add modules
There are some rules how to add modules to your application:

* It always should be module `main` and its placeholder `__index.dust` with
template of whole application page (html, head, body etc)
* In fact every module is a directory, name of directory is a name of module
* Module can optionally have a logic (can just has templates), if so 
it should have `index.js` that exports module constructor
* Module can optionally have placeholders, if so it should have `placeholders`
directory inside with [dustjs](https://github.com/linkedin/dustjs) templates.
Placeholders can be placed in sub-directories but with unique names

Please keep in mind that module name (directory name) should satisfy regular 
expression `^[a-z]+[a-z0-9-]*$`.

##Module context
Every module instance always has `$context` property which is assigned by
Catberry when module initializes. Catberry updates `$context` every time when the 
state of application is changed. 

At server Catberry creates new instance of module for every incoming 
request (but call constructor only once) therefore `$context` object is different
for every incoming HTTP request and represents URL parameters.

In browser Catberry creates module once and create `$context` at the same time.
Then just update state of `$context` every time user clicks link with URLs
inside the application.

##ModuleBase
Also it can be really useful to inherit your module from [catberry-module]
(https://www.npmjs.org/package/catberry-module). It is a base module 
implementation with "smart method invocation" that reduce all this code that
should decide what logic to execute by placeholder, event or form name.

##Example of application structure
Typically directory structure of your application should look like this:
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
lib/ # directory for your own external non-catberry components/services
public/ # this directory is default destination for browser bundle building
browser.js # browser initial script
server.js # connect server start script
routes.js # definition of URL route definitions
events.js # definition of event route definitions
```

##Module code watch and reload
By default Catberry works in debug mode and it means that all changes in code
of your modules will automatically reload modules in runtime. You can switch it 
to release mode passing `isRelease: true` parameter in config of Catberry 
application like this:

```javascript
var catberry = require('catberry'),
cat = catberry.create({isRelease: true}),
```

If you want to see finished application as an example then please proceed to 
[example directory](https://github.com/catberry/catberry-cli/tree/master/templates/example).

Read next:

* [Placeholders](placeholders.md)

Read also:

* [Render Method](render-method.md)
* [Handle Method](handle-method.md)
* [Submit Method](submit-method.md)
* [Context](context.md)
