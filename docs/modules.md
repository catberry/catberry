#Modules
The main logic unit in Catberry is Module.

When you use Catberry your application root looks like this:

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
```

If you want to see finished application as an example then please proceed to [example](../example) folder.

* In fact every module is a folder
* All modules should be placed into "catberry_module" folder
* Every module should contain "index.js" file, "placeholders" folder. Also "assets" folder but it is optionally
* Assets can be CSS files, PNG, JPEG, GIF images, static HTML or JS files
* All assets except CSS will be processed and put to "public" folder in subfolder with module name
* All CSS files will be concatenated in one style.css and put to public folder

**Warning**: According reasons above you should use right URL links in HTML and CSS relatively from public folder.

More details about "client.js", "server.js" and "map.js" files you can find in [Get started guide](get-started.md).

##index.js

First of all let's talk about "index.js" - this is module initial script that probably just returns "Module Constructor".

```javascript
module.exports = require('./ModuleConstructor');
```

But you can specify more complex logic here if you wish but remember there is no way to use require dynamically inside any statements and do not use environment-specified objects like "window" or "process" because this code will be executed both at server and browser.

##Placeholders

Placeholder is a [dustjs](https://github.com/linkedin/dustjs) template that is used to render module-related blocks on page.

There are two reserved names of placeholders:

 1. \_\_index - is used as whole page template and is called "root placeholder"
 2. \_\_error - is used to show user-friendly error messages in blocks which cause error during rendering. It is called "error placeholder"

More details about placeholders you can see below in "render" method description.

##Interface
Module logic is presented by constructor and its prototype that should have 3 methods described below.
Every method must invoke callback to notify catberry that operation is finished. Also you can pass optional 'then' function as last argument into every callback.

##How to split page to modules and placeholders
This is very easy, just use these rules below:

* If you can prepare whole data context for some part of page using one API request that means this part of page is a placeholder
* If you want to refresh some different parts of page (placeholders) always together using shared parameters from URL then you should group these placeholders into one module

###Render
render(string, Object, Function(Error, Object, Function)) - placeholder name, current application state and callback for external error handling and to pass data to template engine.

The second argument is very interesting. It has all state parameters and set of some service fields in '$$' property:

* args.$$.$cookies - current [CookiesWrapper](services/cookies-wrapper.md) instance
* args.$$.$pageName - name of module that has rendered first (root) placeholder in this request
* args.$$.$url - URL of current request
* args.$$.$global - set of global parameters that are accessible for all modules
* args.$$.$context - set of data contexts that already were created by other render methods (other placeholder rendering process).
Using this object you can re-use data from one rendering process to another per one request.

**Warning**: this method is executed both at server and browser and should not use any environment-specified objects like "window" or "process".

If current rendering process meets placeholder link it requests rendering of placeholder inside module that is a parent of placeholder.
This method should request required data from service with business logic, create and send data context to callback for template engine.

Placeholder link is any non-self-closed HTML element with special ID like:

```html
<div id="moduleName_placeholderName"> </div>
```

Rendered content will be placed inside this element.

When stream-based rendering engine meets such div element it calls method render of module "moduleName" and pass it "placeholderName" as the first argument.
In this situation current URL is very important because it describes current application state, for example:

```
http://localhost:3000/hello?color=red?hello_tab=first&hello_rightBar=hidden&cat_state=happy
```

This URL defines that module "hello" will receive parameters:

```javascript
{
	color: 'red',
	tab: 'first',
	rightBar: 'hidden'
}
```

And module "cat" will receive:

```javascript
{
	color: 'red',
	state: 'happy'
}
```

As you could guess all parameters without module name prefix is global for all modules like "color" in this case.

One more important thing is "/hello" URL path, it means that main page template will be placeholder called "\_\_index" of module "hello".
Another words first of all method "render" of module "hello" will be called with placeholder name "\_\_index" then rendered template will be scanned for more placeholder links and render them all.

All placeholder links could appear dynamically using data from template data context, it will be processed correctly and recursively with anti-infinity loop protection.

###Handle
handle(string, callback(Error, Function)) - event name and callback for external error handling.

**Warning**: This method is executed only in browser and you safe to use any browser specified objects like "window".

When user clicks link (\<a\> elements) with "href" attribute equals some hash or it has "data-event" attribute with specified event name then it causes event which will be passed to module's method "handle".
If you want to include this event into page state you should use hash in URL (for example, opened dialog). In this case if you share this link to another user he will see the same dialog when open your link.

Hash events have two stages:

 1. stage when any hash appears in URL it causes event named by hash
 2. stage when any hash is changed by another, in this case it causes event named by hash but with '!' char as prefix

In case when state restoration does not matter for you it is useful to specify "data-event" attribute in link. It will raise event in module directly without hash change.

So the same thing as with URL parameters works with event names, if you specify prefix equals to module name then event will be sent only to this module otherwise in all modules as global.

Example of event-powered links:

Some link to show authentication dialog:

```html
<a href="#hello_auth">Login</a>
```

This link invokes "handle" method with event name "auth" in module "hello". When another link with hash will be clicked it calls "handle" method with event name "\!auth" in module "hello".

Another example:

```html
<a data-event="bang">Need help?</a>
```

This link invokes "handle" method with event name "bang" in all modules. It does not change URL and there is no "\!bang" event then.

###Submit
submit(string, Object, callback(Error, Function)) - form name, object with all inputs names and values inside form and callback for external error handling.

**Warning**: This method is executed only in browser and you safe to use any browser-specified objects like "window".

This method is called on every click of form's submit button. It serializes button-related form and send it to module.

To link form with module you should specify special attributes:

* name - form should have a name to be sent to module
* data-module - name of module-receiver
* data-dependents (optional) - list of placeholders joined by '\&' char which depend on data that is submitted by form. These placeholders will be refreshed after form's data is processed.

Example of simple form linked with module:

```html
<form name="post" data-module="chat" data-dependents="chat_post&chat_messages">
	Enter message below:<br/>
	<input name="message" type="text"><br/>
	<input type="submit" value="Send">
</form>
```

When user clicks "Send" button it calls "submit" method of module "chat" with form name "post" and form object described below:

```javascript
{
	message: 'some text'
}
```

After module's submit method does callback then placeholders "post" and "messages" of module "chat" will be re-rendered with refreshed data.

During form's data processing all inputs inside form will be disabled.

##Example

Here is "Chat Module" constructor implemented in demo application.

```javascript
'use strict';

module.exports = ChatModule;

var util = require('util');

var MESSAGE_ENTER_NICKNAME = 'Please enter nickname',
	ERROR_RENDER_NOT_FOUND =
		'This module does not have method to render placeholder "%s"';
// these all arguments are injected in constructor
// $-prefixed arguments are instances of type registrations in ServiceLocator.
// Other arguments are values from config object.
/**
 * Creates new instance of chat module.
 * @param {Logger} $logger Logger to log some messages.
 * @param {ModuleApiProvider} $moduleApiProvider Module API provider to do
 * some actions on page.
 * @param {ChatServiceClient} $chatServiceClient Chat client
 * to connect and use chat.
 * @param {jQuery} $jQuery jQuery library instance.
 * @param {string} chatSubtitle Chat subtitle text.
 * @constructor
 */
function ChatModule($logger, $moduleApiProvider, $chatServiceClient, $jQuery,
	chatSubtitle) {
	this._logger = $logger;
	this._api = $moduleApiProvider;
	this._chat = $chatServiceClient;
	this.$ = $jQuery;
	this._chatSubtitle = chatSubtitle;

	var self = this;
	if (this._api.whereAmI() === 'browser') {
		this._chat.on('changed', function () {
			self._api.requestRefresh('chat', 'messages');
		});
	}
}

/**
 * Current instance of jQuery.
 * @type {jQuery}
 */
ChatModule.prototype.$ = null;
/**
 * Current logger.
 * @type {Logger}
 * @private
 */
ChatModule.prototype._logger = null;
/**
 * Current module API provider.
 * @type {ModuleApiProvider}
 * @private
 */
ChatModule.prototype._api = null;
/**
 * Current chat client.
 * @type {ChatServiceClient}
 * @private
 */
ChatModule.prototype._chat = null;

// following method works on both server-side and client-side
// need to remember do not use environment-specified code here.
/**
 * Renders all specified placeholders by name.
 * @param {string} placeholderName Name of placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.render = function (placeholderName, args, callback) {
	var renderName = placeholderName + 'Render';

	if (!(renderName in this)) {
		var error = new Error(
			util.format(ERROR_RENDER_NOT_FOUND, placeholderName));
		callback(error);
		return;
	}

	this[renderName](args, callback);
};

// methods "handle" and "submit" are executed only on client-side in browser
// usage of browser-specified methods is safe
/**
 * Handles all events (location hash changes) on page.
 * @param {string} eventName Event name "hash"
 * or "!hash" if hash changes to another one.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.handle = function (eventName, callback) {
	var self = this,
		handler = function (error) {
			if (error) {
				window.alert(error);
				return;
			}
			self._api.requestRefresh('chat', 'messages');
			self._api.requestRefresh('chat', 'post');
		};

	if (eventName === 'auth') {
		var nickname = window.prompt(MESSAGE_ENTER_NICKNAME);
		this._api.clearHash();

		this._chat.startSession(null, nickname, handler);
	} else if (eventName === 'quit') {
		this._api.clearHash();
		this._chat.endSession(null, handler);
	} else {
		callback();
	}
};

/**
 * Submits data to module from HTML forms on page.
 * @param {string} formName Name of form.
 * @param {Object} formObject Object where keys are input names.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.submit = function (formName, formObject, callback) {
	if (formName !== 'post' || !formObject.message ||
		formObject.message.length === 0) {
		callback();
		return;
	}

	this._chat.postMessage(null, formObject.message, function (error) {
		if (error) {
			window.alert(error);
		}
		callback(null);
	});

};

/**
 * Renders messages placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.messagesRender = function (args, callback) {
	this._chat.getMessages(args.$$.$cookies.toString(), 100,
		function (error, data) {
			if (error) {
				callback(null, {message: null});
			} else {
				callback(null, data);
			}
		});
};

/**
 * Renders post form placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.postRender = function (args, callback) {
	this._chat.whoAmI(args.$$.$cookies.toString(), function (error, data) {
		if (error) {
			callback(null, {});
			return;
		}

		callback(null, {nickname: data});
	});
};

/**
 * Renders chat body placeholder.
 * @param {Object} args Current state arguments.
 * @param {Function} callback Callback on finish.
 */
ChatModule.prototype.bodyRender = function (args, callback) {
	callback(null, {chatSubtitle: this._chatSubtitle});
};
```