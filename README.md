#Catberry
##Web-framework and connect middleware for fast modular back/front-end web-applications based on isomorphic JavaScript and  node.js
Client-side part is still in work.

###What I've got?
* First of all it's fast, because uses own stream-powered page template rendering engine. It means client will start receiving of response data as soon as possible when first chunks of data is ready. While some module does long-time operations your browser will be receiving other resources specified in head fo page (scripts, CSS, images).
* Catberry framework uses [dustjs](https://github.com/linkedin/dustjs) template engine improved by LinkedIn. It implements stream interface therefore all content will be streamed into client browser immediately.
* It supports [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection). It means your can easy override any catberry's core module implementation with your own and inject all your additional modules and config parameters into constructors.
* It provides very simple module API for both server-side and client-side usage of the same module.
* We care about code style and quality: whole code base is commented with jsDoc and according one code style.
* We care about stability, every finished module is covered by unit-tests.

###How To
####Create a module
You can use example folder in catberry as a own project template. But also you can create whole project by yourself:

* Create folder for your project and then

```bash
npm install catberry
```

* Create **catberry_modules** subfolder in your project folder
* All subfolders in catberry_modules are modules and its names are modules names in catberry
* In every module folder you can create **placeholders** subfolder, which must contain only templates, and its names are placeholder's names
* Also every module must have **index.js** file for main script, which must return module constructor.

Typical catberry's application
```
catberry_modules/
	module1/
		placeholders/
			__index.dust # root placeholder for URL /module1
			placeholder1.dust
			placeholder2.dust
			...
			placeholderN.dust
		index.js
	...
	moduleN/
public/ # for static content
index.js # connect application start script
```

* Here is some module example below:

```javascript
'use strict';

module.exports = HelloModule;

function HelloModule($logger, title) {
	// logger is registered in ServiceLocator and received via dependency injection
	// title also received via dependency injection from specified catberry config object
	this._title = title;
	this._logger = $logger;
}

HelloModule.prototype._title = '';
HelloModule.prototype._logger = null;

HelloModule.prototype.render = function (placeholderName, args, callback) {
	switch (placeholderName) {
		case '__index':
			this._logger.trace('index placeholder render');
			callback(null, {title: this._title});
			break;
		case 'hello-world':
			this._logger.trace('hello-world placeholder render');
			callback(null, {who: args.who });
			break;
		case 'signature':
			this._logger.trace('signature placeholder render');
			// you can throw any exceptions
			if (!args.author) {
				callback(new Error('No author!'), null);
				return;
			}
			callback(null, {author: args.author });
			break;
		case 'subtitle':
			this._logger.trace('subtitle placeholder render');
			// of course you can use async operations
			setTimeout(function () {
				callback(null, {});
			}, 2000);
			break;
		default:
			callback(new Error('No such placeholder'), '');
	}
};

HelloModule.prototype.handle = function (eventName, placeholder, callback) {
	// this function will work at front-end soon
};

HelloModule.prototype.submit = function (formName, formObject, callback) {
	// this function will work at front-end soon
};
```

#### Create an application

When you properly create a module you can create application using [connect](https://www.npmjs.org/package/connect):

```bash
npm install connect
```

```javascript
'use strict';

var http = require('http'),
	path = require('path'),
	publicPath = path.join(__dirname, 'public'),
	connect = require('connect'),
	catberry = require('catberry'),
	cat = catberry({
		title: 'Catberry example module',
		publicPath: publicPath
	}),
	app = connect();

// all environments
app.use(connect.static(publicPath));
app.use(cat.getRouter());
app.use(connect.errorHandler());

http
	.createServer(app)
	.listen(3000);
```

####Contribute
If you have found a bug, please create pull request with mocha unit-test which reproduces it.
If you want to propose some improvements just create pull request but please do not forget to use **npm test** and **./js-check** scripts to be sure that you code is awesome.

Denis Rechkunov <denis.rechkunov@gmail.com>
