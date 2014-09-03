#Building Browser Bundle

Catberry application object has a method `build` that can be used like this:

```javascript
var catberry = require('catberry'),
	cat = catberry.create();
cat.build();
```

This method can be called in `/server.js` script or separately in
different script and process.

It is highly recommended to use `build` method in separated process 
(not in server process) because JavaScript minification requires a lot of memory 
and it looks like your `/server.js` script spends 1GB of RAM, which is not so of 
course.

For example you can use `/build.js` script with following:
```
node ./build.js release
```

To build browser bundle Catberry uses [browserify](http://browserify.org) which 
is awesome and can convert your JavaScript server-side code to browser code.

##Including packages into browser bundle
There are some rules according browserify limitations:

* If you want to include some module into browser bundle it should be required
directly via `require('some/path/to/module')`. If module path is variable it
will not work
* If you want to exclude some server package from browser bundle you can
mark it with special hint comment like this:
```javascript
/**no-browser-bundle**/
var serverSidePackage = require('./lib/package');
```
Some Catberry plugins uses this hint to exclude its server side 
implementations from browser bundle. Also you can use this hint for server-side
configuration that can have some secret parameters and it should not appear 
in browser.

Filter for such excluded `require` is implemented as browserify transform 
stream and has a good performance.

All modules are defined in `modulesFolder` 
(details in [Modules](modules/index.md) section) and its placeholders are 
included into browser bundle automatically as well as [URL Route Definition]
(routing/url-route-definition.md) and [Event Route Definition]
(routing/event-route-definition.md) files.

##Building modes
There are two modes of building browser bundle:

* Debug mode - when everything is watched by builder and rebuild if something
is changed
* Release mode - when there is no watch on files and all code in result bundle 
is minified using [uglify-js](https://www.npmjs.org/package/uglify-js)

By default it is in debug mode, to switch it to release mode you should pass
`isRelease: true` parameter in config object like this:
```javascript
var isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined,
	catberry = require('catberry'),
	cat = catberry.create({isRelease: isRelease});

cat.build();
```

Read next:

* [Event Bus and Diagnostics](event-bus-and-diagnostics.md)