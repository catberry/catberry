#Get started

This is a guide about how to start your new Catberry project fast.

The easiest and fastest way to start your new project is take [example](../example) project as a basis.

All you need to start Catberry application is set of your Catberry modules and some scripts to initialize your application are described below.

Typical project structure looks like this:

```
catberry_modules/
	module1/
		assets/ # folder with all module-related resources
			style.css
			img1.png
			img2.gif
			img3.jpg
			static.html
		placeholders/
			__index.dust # root placeholder for URL /module1
			__error.dust # error placeholder to replace errors in release mode
			placeholder1.dust
			placeholder2.dust
			...
			placeholderN.dust
		ModuleConstructor
		index.js
	...
	moduleN/
lib/ # folder for your own external non-catberry modules
public/ # for static content (it will be created automatically and cleared on every startup)
client.js # browser initial script
server.js # connect server start script
map.js # definition of URL mappings
config.json # config file
```

Whole detailed information how to develop new Catberry modules you can find in [Modules Documentation](modules.md).

Let's talk about other stuff in your project except "catberry_modules" folder.

##"lib" folder
If you developed projects using node.js you might know that "lib" folder is adopted approach to place modules of any application or package.
Most of packages in npm do so. So it is a best practice for Catberry project too.

##"public" folder
You do not need to create this folder it will be created automatically on application startup.
This folder is used to publish all module's resources like images, CSS, static HTML files and browser scripts.
Also when you start Catberry it builds browser script bundle with all Catberry's browser modules and all modules from folder "catberry_modules" then put it to catberry.js file in public folder.

**Warning**: Be careful! "public" folder is cleared on every application startup.

##"client.js" script

This is initial script for browser which should do all initialization stuff.

For example, chat service application:

```javascript
var ChatServiceClient = require('./lib/ChatServiceClient'),
// create catberry application instance.
	catberry = require('catberry'),
	config = require('./config'),
	app = catberry.create(config);

// then you could register your external modules to inject into catberry modules.
app.locator.register('chatServiceClient', ChatServiceClient, config, true);

// tell catberry to start when HTML document will be ready
app.startWhenReady();
```

You need to create Catberry application instance, register external modules (non-catberry modules) into service locator and then invoke "startWhenReady()" method which will start application when DOM is ready.

##"server.js" script

This is initial back-end script which should starts HTTP server using [connect](https://github.com/senchalabs/connect)/[express](https://github.com/visionmedia/express).

For example, the same chat service application:

```javascript
var ChatServiceClient = require('./lib/ChatServiceClient'),
	ChatService = require('./lib/ChatService'),
	catberry = require('catberry');

// if we want to start catberry application using connect
var http = require('http'),
	path = require('path'),
	publicPath = path.join(__dirname, 'public'),
	connect = require('connect'),
	config = require('./config'),
// create instance of catberry application and pass config to it
	cat = catberry.create(config),
	app = connect();

// then you could register your external modules to inject into catberry modules.
cat.locator.register('chatServiceClient', ChatServiceClient, config, true);

app.use(connect.cookieParser());
app.use(connect.session({secret: 'meow'}));

// set our chat service as connect middleware
var chat = cat.locator.resolveInstance(ChatService, config);
app.use(chat.middleware());

// and use catberry as connect/express middleware too
app.use(cat.getMiddleware());

// all non-handled requests by catberry will be passed to next middleware
// like static files
app.use(connect.static(publicPath));
app.use(connect.errorHandler());
http
	.createServer(app)
	.listen(3000);
```

You need to create Catberry application instance, register external modules (non-catberry modules) into service locator and then register Catberry application as middleware using "getMiddleware()" method.

##"map.js" script

Is used for URL mapping engine and this file is optional. More details you can read in [URL Mapping Engine Documentation](url-mapping.md).

##"config.json" file

It is a good practice to put config file in separate file and require the same file in "client.js" and "server.js" scripts.

## Release and Debug mode

By default Catberry application is in Debug mode to switch it to Release just pass config parameter "isRelease: true" when create your Catberry application instance.

When it is in debug mode:

* There is no minification of scripts, CSS and images
* There is watch on all files and when it changes all changed resources will be rebuilt

When it is in release mode:

* All published resources will be minified and optimized
* There is no any watch on change


You can use isRelease config parameter via dependency injection in any your own module as it is described in [Service Locator Documentation](service-locator.md).

It is a good practice when you pass mode as a process argument like it is done in example.
Also you can pass "clean" command to clean all stuff published and generated by Catberry using "clean" method of Catberry application instance (see [example/server.js](../example/server.js)).