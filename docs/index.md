# Catberry Framework Documentation

![Catberry](images/logo.png)

# Table of contents
* [Get started](#get-started)
* [Isomorphic/Universal applications](#isomorphicuniversal-applications)
* [Flux](#flux)
* [Stores](#stores)
	* [Store's interface](#stores-interface)
	* [Store's context](#stores-context)
	* [Code example](#code-example)
* [Cat-components](#cat-components)
	* [Cat-component's interface](#cat-components-interface)
	* [Cat-component's context](#cat-components-context)
	* [Code example](#code-example-1)
* [Example of application structure](#example-of-the-application-structure)
* [Routing](#routing)
	* [Colon-marked parameters in a string](#colon-marked-parameters-in-a-string)
	* [Colon-marked parameters with additional 'map' function](#colon-marked-parameters-with-an-additional-map-function)
	* [Regular expression](#regular-expression)
* [Catberry services](#catberry-services)
	* [Service locator](#service-locator)
	* [Registration of own services](#registration-of-your-own-services)
	* Userland catberry services
		* [Logger](#logger)
		* [Config](#config)
* [Cookie](#cookie)
* [Template engines](#template-engines)
* [Browser bundle](#browser-bundle)
	* [Including packages into the browser bundle](#including-packages-into-the-browser-bundle)
	* [Code watching and reloading](#code-watching-and-reloading)
* [Event bus and diagnostics](#event-bus-and-diagnostics)
	* [Event names and arguments](#event-names-and-arguments)
* [CLI](#cli)
* [Plugin API](#plugin-api)
	* [Store transformation API](#store-transformation-api)
	* [Component transformation API](#component-transformation-api)
	* [Post-build action API](#post-build-action-api)
	* [Browserify transformation and plugin API](#browserify-transformation-and-plugin-api)
	* [List of officially supported plugins](#list-of-officially-supported-plugins)

# Get Started
First of all you need to install the [CLI](https://github.com/catberry/catberry-cli):

```bash
npm install -g catberry-cli
```

After that, you can create a project.
So, create a directory for your new pretty awesone project and change to the new directory.

```bash
mkdir ~/new-project
cd ~/new-project
```

Now you can initialize one of the Catberry's project templates.

Please choose one:

* `example` - the project that works with GitHub API and demonstrates how to implement such kind of isomorphic/universal application using the Catberry Framework.
* `empty-handlebars` - the empty project using the [Handlebars](http://handlebarsjs.com/) template engine.
* `empty-dust` - the empty project using the [Dust](https://github.com/catberry/catberry-dust) template engine.
* `empty-jade` - the empty project using the [Jade](http://jade-lang.com/) template engine.

After you have chosen a template, please do the following:

```bash
catberry init <template>
```
Where `<template>` is a chosen name.

For example,

```bash
catberry init empty-handlebars
```

Now you have created the project structure.
Also, you can see some instructions on the console that say how to install and start
the application.

You need to install the dependencies:

```bash
npm install --production
```

Then you can start your application, but you must choose the mode:

 * Debug mode – no code minification, watching files for changes and rebuilding/re-initializing
 * Release mode – code is minified, no watching for changes, production-ready

To start in the release mode:

```bash
npm start
```

To start in the debug mode:

```bash
npm run debug
```

Or

```bash
npm run debug-win
```

in case you're using Windows.

The application will output on the console which port it's listening to.
The address would be [http://localhost:3000](http://localhost:3000) by default.

Now you have your very first Catberry application, create your own [Stores](#stores) and
[Cat-components](#cat-components).

The CLI can help you with that as well.

For adding stores:

```bash
catberry addstore <store-name>
```

where `<store-name>` is a store's name like `some-group/Store`.

For adding cat-components:

```bash
catberry addcomp <component-name>
```

where `<component-name>` is a component's name like `hello-world`.

Hope now you are an expert in the Catberry Framework. Enjoy it!

**[↑ back to top](#table-of-contents)**

# Isomorphic/Universal applications
TL,DR; of some of the immediate benefits solved by isomorphic/universal applications:

* _Search-engine crawlable single page application_ -- the same page can be rendered as easily on the server as in the browser.
* _*D.R.Y* templating & logic_ -- since universal modules are written only once and in JavaScript, you never have to repeat yourself or maintain the same logic in two separate code-bases.

_Isomorphic/universal applications_ are built such that given modules can be used identically on the server and/or client.

Take, for example, code used for rendering pages. It could be used first on the server--for SEO, shared links, fast initialization, etc.--and then in the browser, or entirely in the browser, as a [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application), no server rendering required.

There is an awesome [Airbnb blog post](http://nerds.airbnb.com/isomorphic-javascript-future-web-apps/) that explains the idea behind isomorphic JavaScript applications and what they constitute.

Also, you can checkout the the JSConf 2014 talk by Spike Brehm: [Building Isomorphic Apps](http://www.youtube.com/watch?v=CH6icJbLhlI).

Catberry is an isomorphic framework for building front-end apps using universal components. The idea behind Catberry is to build a front-end only application that can get its data through a set of RESTful APIs, and quickly render the resulting pages.

**[↑ back to top](#table-of-contents)**

# Flux
Catberry uses [Flux](https://facebook.github.io/flux/docs/overview.html)-like architecture. It defines that you should use [store](#stores) as a data source and some kind of view/component that gets and renders data from the store. So, Catberry uses [cat-components](#cat-components) as those views.

Everything you need to know that there are [stores](#stores), [cat-components](#cat-components) and the store dispatcher that controls the whole communication among them. But everything happens inside the framework you shouldn't care about it.

[Store](#stores) – can handle some action messages from [cat-components](#cat-components) and all stores can trigger the `changed` event.
The `changed` event means that Catberry should re-render every component in the browser that depends on the changed store.

Store dispatcher works in such way that does not allow to call store data loading while previous loading is not finished, also it helps to avoid some crazy cases when all your [stores](#stores) trigger `changed` event at
the same time and the re-rendering process breaks the page.
This is a robust and high-performance architecture that allows to create huge and complex applications with many data dependencies.

One more thing about Catberry's architecture: the main approach for controlling asynchronous workflow is [Promise](https://www.promisejs.org/). Catberry uses the native `Promise` in a browser or in Node.js (V8). If global type `Promise` is not found in a browser the framework defines it using ["Bare bones Promises/A+ implementation"](https://www.npmjs.org/package/promise). It means you can use the `Promise` type wherever you want without any doubt.

**[↑ back to top](#table-of-contents)**

# Stores
The store is a module that loads data from a remote resource using routing parameters. It also can handle action messages from cat-components or other stores and send requests to the remote resource changing data. It can emit `changed` event whenever it decides that data on the remote resource is changed and the application need to reload it.

By default, all stores should be placed into `./catberry_stores` directory in your project. But you can change this directory by the [config](#config) parameter. Every file should export a class or a constructor function for creating store's instances.

When Catberry initializes it does a recursive search in this directory and loads every store file. The relative file path without an extension becomes a store name.

So, if you had the file hierarchy as following:
```
./catberry_stores/
	group1/
		store1.js
		store2.js
	group2/
		store1.js
		store2.js
	store1.js
	store2.js
```
then you would have such store list:
```
group1/store1
group1/store2
group2/store1
group2/store2
store1
store2
```

Please, keep in mind that all store names are case-sensitive.

## Store's interface
Every store should export a class or a constructor function for creating its instances. Also, you can
optionally define following methods and properties in the class/prototype.

* `$lifetime` – the value means how long Catberry should cache data loaded from this store (milliseconds). By default, it is set to 60000 ms.
* `load()` – loads data from a remote resource and returns it (usually a Promise of it).
* `handle<SomeActionNameHere>(args)` – handles an action and returns a result (or a Promise of it). You can submit form data to a remote resource here or just change some internal state in the store and then call `this.$context.changed()`. For example, you can name a store's method `handleFormSubmit` and when a component or another store send an action to the store with a name like following `form-submit`/`form_submit`/`FORM_SUBMIT`/`formSubmit`/`FormSubmit` it will trigger the `handleFormSubmit` method of the store.

Please, keep in mind that stores are universal and their source code is being executed in both server and browser environments. Therefore you can not use environment-specific global objects or functions like `window`, `process` or DOM methods.

## Store's context
Every store always has a context. Catberry sets the property `$context`
to every instance of each store. It has following properties and methods:

* `this.$context.isBrowser` – `true` if the source code is being executed in the browser environment.
* `this.$context.isServer` – `true` if the source code is being executed in the server environment.
* `this.$context.userAgent` – the current user agent string of the environment.
* `this.$context.cookie` – the current [cookie wrapper](#cookie) object.
* `this.$context.location` – the current [URI](https://github.com/catberry/catberry-uri) object
that constains the current location.
* `this.$context.referrer` – the current [URI](https://github.com/catberry/catberry-uri) object
that contains the current referrer.
* `this.$context.state` – the current set of parameters from the [route definition](#routing).
* `this.$context.locator` – the [Service Locator](#service-locator) of the application.
* `this.$context.redirect('String')` - redirects to a specified location string.
* `this.$context.notFound()` - hands over request handling to the next [express/connect middleware](http://expressjs.com/en/guide/using-middleware.html).
* `this.$context.changed()` – triggers the `changed` event for the current store. You can use this method whenever you want, Catberry handles it correctly.
* `this.$context.getStoreData('storeName')` – gets a promise of another store's data, if `storeName` was the same as current it would be `null`.
* `this.$context.sendAction('storeName', 'name', object)` – sends an action to a store by the name and returns a promise of the action handling result. If the store does not have a handler for this action the result will be always `null`.
* `this.$context.sendBroadcastAction('name', object)` – the same as the previous one but the action will be sent to all stores that have a handler for this action. Returns a promise of `Array` of results.
* `this.$context.setDependency('storeName')` – sets a dependency on another store's data. Every time the store-dependency changes, the current store is also triggered as changed.
* `this.$context.unsetDependency('storeName')` – removes the dependency set by the previous method.

Every time the router computes a new application state, it re-creates and re-assigns a context to each store, therefore, *do not save references to the `this.$context` objects*.

Please keep in mind that if you're using `getStoreData('storeName')` method and another store's data as a part of the current store's data you must set that store as a dependency for the current store (`this.$context.setDependency('storeName')`), otherwise the cache of the current store won't be updated if the store-dependency is changed.

For example, you have two stores `Country` and `CityList` and you're using `this.$context.getStoreData('Country')` in the `CityList`'s `load()` method as an additional data source. In this case, if the `Country` store was changed the `CityList` store would never be updated. To avoid this, just add a `this.$context.setDependency('Country')` line to the `CityList`'s constructor.

Also, there is one more thing about setting a cookie and calling `redirect`/`notFound` methods.
If you use these methods while rendering the `document` or `head` components the action will be accomplished using HTTP headers and status codes on the server, otherwise it would be rendered as inline `<script>` tags.

## Code example
This is an example how your store's file would look like:

```javascript
'use strict';

class Some {
	/**
	 * Creates a new instance of the "some" store.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {

		/**
		 * Current universal HTTP request for environment-independent requests.
		 * @type {UHR}
		 * @private
		 */
		this._uhr = locator.resolve('uhr');

		/**
		 * Current lifetime of data (in milliseconds) that is returned by this store.
		 * @type {number} Lifetime in milliseconds.
		 */
		this.$lifetime = 60000;
	}

	/**
	 * Loads data from a remote source.
	 * @returns {Promise<Object>|Object|null|undefined} Loaded data.
	 */
	load() {
		// Here you can do any HTTP requests using this._uhr.
		// Please read details here https://github.com/catberry/catberry-uhr.
	}

	/**
	 * Handles an action named "some-action" from any component or store.
	 * @returns {Promise<Object>|Object|null|undefined} Response to the component/store.
	 */
	handleSomeAction() {
		// Here you can call this.$context.changed() if you're sure
		// that the remote data on the server has been changed.
		// You can additionally have many handle methods for other actions.
	};
}

module.exports = Some;
```

**[↑ back to top](#table-of-contents)**

# Cat-components
You might think that cat-components are mustaches, paws or a tail but that's not actually always so.

The "Cat-component" is an universal implementation of the [Web-Component](http://webcomponents.org/)-like view. If dig deeper it is a subset of features that web-components specification declares and a couple of additional features specific for the framework.

The main point of the "Cat-component" is the declaration of a custom tag that has its own template (any template engine), its own logic written in JavaScript, can be rendered at the server and is organized as a directory that you can publish/install as a [NPM dependency](https://docs.npmjs.com/files/package.json#dependencies) (a public package or a private repo).

The "Cat-component" is declared as a directory with the `cat-component.json` file by default. But you can change it in the [config](#config). When Catberry initializes the application it does recursive search for such directories starting with your project root including first-level dependencies in `node_modules` directory. It means that you can publish and use Cat-components from [NPM](https://docs.npmjs.com/files/package.json#dependencies).

The `cat-component.json` file consists of following:

* `name` – the name of the component and a postfix of the full custom tag name which would be `cat-name` (optional, by default it is a name of the directory).
* `description` – some additional information about the cat-component (optional). It's not used yet but reserved for the future usage.
* `template` – a relative path to the component's template (required).
* `errorTemplate` – a relative path to the component's error template that would be rendered in case of an error occurs (optional).
* `logic` – a relative path to the file that exports a class or a constructor function for the component's logic object (optional, index.js by default).

For example, the file would look like this:

```json
{
	"name": "cool",
	"description": "Some awesome and cool cat-component",
	"template": "./template.hbs",
	"errorTemplate": "./errorTemplate.hbs",
	"logic": "./Cool.js"
}
```

In this example above, you would get a custom tag `<cat-cool></cat-cool>` available in your application.

Please, keep in mind that *all component names are NOT case-sensitive*. If you declared a component with the same name twice you would receive a warning message on the console at startup.

After you define a cat-component you can use it like this:

```html
<cat-cool id="unique-value" cat-store="group/store1" some-additional="value" ></cat-cool>
```

There are several important moments here:
* Every component's tag must have an `id` attribute with a unique value for the entire application, otherwise
it would not rendered and throws an error.
* You can set the `cat-store` attribute which means if the store is changed this component must be re-rendered automatically.
* You can set any additional attribute you want and use it inside the component's source code.
* You must always use opening and closing tags (not self-closing tags). The majority of the browsers do not support self-closing custom tags correctly.
* You can use tags of other components inside the template of the component. Nested components are supported but don't forget about unique IDs. *The best practice is to build IDs of nested components using the current component's ID as a prefix*.

There are two reserved component names that are used in unusual way:
* `document` – the root template of the entire application (doctype, html, body etc.).
It can not depend on any store. `cat-store` attribute is ignored.
* `head` – the component for the HEAD element in the document. It is always rendered using special diff/merge mode, otherwise all styles and scripts would be re-loaded every time. It can depend on a store and works as usual cat-component except the rendering approach.

## Cat-component's interface
The cat-component's logic file should export a class or a constructor function for creating its instances. Catberry creates a separate instance for each custom tag on the page. Also, you can optionally define the following methods in the class/prototype:

* `render()` – creates and returns data (or Promise of it) for the component's template. The method is called every time when a component's custom tag appears on the page or needs to be updated with new data. The method is called in both server and browser environments.
* `bind()` – creates and returns an object with the event bindings (or Promise of it, see the example below). The method is called only in the browser environment every time the page is changed and the component is remounted or on the initial document loading.
* `unbind()` – this method behaves like a destructor and if you want to manually remove some event listeners or to do anything else to clean up you can implement this method. The method is called only in the browser environment every time the component is removed from the DOM.

Some more details about the `bind()` method:
The `bind()` method optionally returns an object that describes all event bindings inside the template of the current component. You can return a binding object (or Promise of it) like this.

```javascript
bind() {
	return {
		click: {
			'a.clickable': this._clickHandler,
			'div#some': this._someDivHandler
		},
		hover: {
			'a.clickable': this._clickableHoverHandler
		}
	};
}
```

As you might notice, every event handler is bound to the current instance of the component, you do not need to use [`.bind(this)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)
on your own. Additionally, you can add event handlers manually inside the `bind` method and then remove them manually in `unbind` method. For example, to handle some global events in the window object.

After the component will have been removed from the DOM all event listeners will be removed
correctly and then the `unbind` method will be called (if it's declared).

Please, keep in mind that the cat-component's constructor and `render` methods are being executed in both server and browser environments because the cat-components are universal. Therefore you can not use environment-specific global objects or functions like `window`, `process` or DOM methods.

## Cat-component's context
Every component always has a context. Catberry sets the property `$context`
to every instance of each store. It has following properties and methods.

* `this.$context.isBrowser` – `true` if the source code is being executed in the browser environment.
* `this.$context.isServer` – `true` if the source code is being executed in the server environment.
* `this.$context.userAgent` – the current user agent string of the environment.
* `this.$context.cookie` – the current [cookie wrapper](#cookie) object.
* `this.$context.location` – the current [URI](https://github.com/catberry/catberry-uri) object that constains the current location.
* `this.$context.referrer` – the current [URI](https://github.com/catberry/catberry-uri) object that contains the current referrer.
* `this.$context.locator` – the [Service Locator](#service-locator) of the application.
* `this.$context.redirect('String')` - redirects to a specified location string.
* `this.$context.notFound()` - hands over request handling to the next [express/connect middleware](http://expressjs.com/en/guide/using-middleware.html).
* `this.$context.getStoreData()` – gets a promise of bound store's data, if store does not exist rejects the promise.
* `this.$context.sendAction('name', object)` – sends an action to the bound store and returns a promise of the action handling result. If the store does not have a handler for this action the result will be always `null`.
* `this.$context.sendBroadcastAction('name', object)` – the same as the previous one but the action will be sent to all stores that have a handler for this action. Returns a promise of `Array` of results.
* `this.$context.element` – the current DOM element that represents the current component.
* `this.$context.attributes` – the set of attributes which component's DOM element has at the moment.
* `this.$context.getComponentById('id')` – gets another component *object* by its ID.
* `this.$context.getComponentByElement(domElement)` – gets another component's *object* by its DOM element.
* `this.$context.createComponent('tagName', attributesObject)` – creates a new component's instance and returns a promise of its DOM element.
* `this.$context.collectGarbage()` – collects all components which have been created using the `createComponent('tagName', attributesObject)` method and are not attached to the DOM at the moment.

Every time the router computes a new application state, it re-creates and re-assigns a context to each store, therefore, *do not save references to the `this.$context` objects*.

Also, there is one more thing about setting a cookie and calling `redirect`/`notFound` methods.
If you use these methods while rendering the `document` or `head` components the action will be accomplished using HTTP headers and status codes on the server, otherwise it would be rendered as inline `<script>` tags.

## Code example
This is an example how your component's logic file would look like:

```javascript
'use strict';

class Some {

	/**
	 * Creates a new instance of the "some" component.
	 * @param {ServiceLocator} locator The service locator for resolving dependencies.
	 */
	constructor(locator) {
		// you can resolve any dependency from the locator.
	}

	/**
	 * Gets data for the template.
	 * This method is optional.
	 * @returns {Promise<Object>|Object|null|undefined} Data for the template.
	 */
	render() {
		return this.$context.getStoreData();
	}

	/**
	 * Returns event binding settings for the component.
	 * This method is optional.
	 * @returns {Promise<Object>|Object|null|undefined} Binding settings.
	 */
	bind() {
		return {
			'a.clickable': () => window.alert('Ouch!');
		}
	}

	/**
	 * Cleans up everything that has NOT been set by .bind() method.
	 * This method is optional.
	 * @returns {Promise|undefined} Promise of nothing.
	 */
	unbind() {
		// nothing to do here we have used bind properly
	}
}

module.exports = Some;
```

**[↑ back to top](#table-of-contents)**

# Example of the application structure
Typically, project structure looks like this:

```
./catberry_stores/
	group1/
		store1.js
		store2.js
	group2/
		store1.js
		store2.js
	store1.js
	store2.js
./catberry_components/
	document/
		index.js
		template.hbs
		cat-component.json
	component1/
		index.js
		template.hbs
		errorTemplate.hbs
		cat-component.json

 # directory for your own external (not Catberry) modules/services
./lib/
 # this directory is a default destination for browser bundle building
./public/
	bundle.js
 # entry script for the browser environment
./browser.js
 # route definitions
./routes.js
 # entry script for the server environment
./server.js
```

If you want to see a finished application as an example then please proceed to the
[example directory](https://github.com/catberry/catberry-cli/tree/master/templates/example).

**[↑ back to top](#table-of-contents)**

# Routing
Catberry has a routing system with a syntax similar to Rails but with a couple of additional features. Each routing definition sets positions in the URI where the [store](#stores) parameters could be. Each parameter is bound to a list of stores and when it's being changed (by a link click, for example) all the stores-dependants trigger their `changed` event automatically which causes re-rendering of all cat-components bound to the stores using new data.

Those route definitions are placed in file `./routes.js`.

Route definition is a rule that describes which URIs are handled by Catberry, which parameters Catberry can parse from those URIs and which stores will receive the parsed parameters.

## Colon-marked parameters in a string
The default definition syntax is following:

```
/some/:id[store1,store2]/actions?someParameter=:parameter[store1]
```

All parameters should be marked with the colon at the beginning and optionally followed by the list of store names that will receive the value of this parameter. These stores are called stores-dependants. This list can also be empty.

In the previous example, `id` value would be set to stores `store1` and `store2`; and the `parameter` value would be set only to the store `store1`.

Please keep in mind that a parameter's **name** in a route definition must satisfy the regular expression `[$A-Z_][\\dA-Z_$]*` and a parameter's **value** should satisfy the regular expression `[^\\\/&?=]*`.

## Colon-marked parameters with an additional `map` function
Also, you can define the mapper object, that allows you to modify the application state object before it will be processed by Catberry.

If you want to use a `map` function just define a route like this:

```javascript
{
	expression: '/user/news/:category[news]',
	map(state) {
		state.news.pageType = 'userNews';
		return state;
	}
}

```

The map function receives the state prepared by a route definition string. The state is an object, where keys are store names and values are state objects for each store. You can change the entire state object if you want
and return it from a map function.

In this example above, the store `news` will receive an additional state parameter `pageType` with the value `userNews`.

## Regular expression
In some rare cases, you may still need to parse parameters using regular expressions. In these cases, you can define a mapper object as following:

```javascript
{
	expression: /^\/orders\/\d+/i,
	map(uri) {
		const matches = uri.path.match(/^\/orders\/(\d+)/i);
		return {
			order:{
				orderId: Number(matches[1])
			}
		};
	}
}
```

In this example above, the store `order` will receive a parameter `orderId` with the value matched with a number in the URL.

## URL with any query parameters
If the route definition includes any query parameters, they are always optional.
For example, if you have such route definition:

```
/some/:id[store1,store2]/actions?a=:p1[store1]&b=:p2[store1]&c=:p3[store1]
```

And you try to route such URL:

```
/some/1/actions?b=123
```

You will receive the state:

```javascript
{
	store1: {
		id: '1',
		p2: '123'
	},
	store2: {
		id: '1'
	}
}
```

The parameters `p1` and `p3` is being skipped. A URL without any query parameters at all will be routed as well.

```
/some/1/actions
```

And you will receive the following state:

```javascript
{
	store1: {
		id: '1'
	},
	store2: {
		id: '1'
	}
}
```

## File example
Here is an example of the `./routes.js` file with all 3 cases together:

```javascript
module.exports = [
	// 1. simple string expression
	'/user/:id[user,menu,notifications]',
	// 2. the string expression with the 'map' function
	{
		expression: '/user/news/:category[news]',
		map(state) {
			state.news.pageType = 'userNews';
			return state;
		}
	},
	// 3. the regular expression with the 'map' function
	{
		expression: /^\/orders\/\d+/i,
		map(urlPath) {
			const matches = urlPath.match(/^\/orders\/(\d+)/i);
			return {
				orderId: Number(matches[1])
			};
		}
	}
];
```

**[↑ back to top](#table-of-contents)**

# Catberry services
In Catberry, every framework's component/module such as Logger or "Universal HTTP(S) Request" are called "services".

The entire Catberry's architecture is built using the [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) pattern. Service Locator is a Catberry's core component that stores all the information about every Catberry's component (service). It is similar to [IoC](http://en.wikipedia.org/wiki/Inversion_of_control) Container in some other platforms. So, if any component depends on another it just resolves it from the Service Locator inside its constructor, for example. If that dependency depends on another one it does the same thing resolving the entire graph of dependencies.

For example, every service including user-defined ones can ask for a "logger" service to log messages to the console:

```javascript
class Some {
	constructor(locator) {
		this._logger = locator.resolve('logger');
	}
}
```

When Catberry initializes itself it registers all its own services into the Service Locator, but framework users can also register their own plugins (services) and even overwrite the implementation of existing Catberry services.

For example, you can replace the Logger service in the Service Locator with your favorite logger, you just need to write an adapter that matches the interface of the [Catberry "logger" service](#logger) and register it like following:

```javascript
const cat = catberry.create();
cat.locator.registerInstance('logger', MyCoolLogger);
```

To register your own services, you should keep in mind that you probably need different implementations of your service for the server and browser environments. But in some cases, it does not matter.

Learn more how to use the Service Locator in the next section.

## Service locator
The entire architecture of the Catberry framework is based on the [Service Locator pattern](http://en.wikipedia.org/wiki/Service_locator_pattern).

## Registration of your own services
There is only one service locator (singleton) in a Catberry application and all Catberry services are resolved from this locator. All the dependencies are being resolved during the `getMiddleware` method call on the server or the `startWhenReady` method in the browser environment.

Before that moment, feel free to register your own services.

Your Catberry application probably has the `./server.js` file like this:
```javascript
const catberry = require('catberry');
const RestApiClient = require('./lib/RestApiClient');
const connect = require('connect');
const config = require('./server-config');
const cat = catberry.create(config);
const app = connect();

// when you have created an instance of the Catberry application
// you can register anything you want in the Service Locator.
// last "true" value means that the instance of your service is a singleton
cat.locator.register('restApiClient', RestApiClient, true);

// you can register services only before this method below
app.use(cat.getMiddleware());
// now Catberry already has initialized the whole infrastructure of services
app.use(connect.errorHandler());
http
	.createServer(app)
	.listen(config.server.port || 3000);
```

Also, for the browser environment you application probably has the `./browser.js` file like this:

```javascript
const catberry = require('catberry');
const RestApiClient = require('./lib/RestApiClient');
const config = require('./browser-config');
const cat = catberry.create(config);

// when you have created an instance of the Catberry application
// you can register anything you want in the Service Locator.
// last "true" value means that the instance of your service is a singleton
cat.locator.register('restApiClient', RestApiClient, true);

// you can register services only before this method below:
cat.startWhenReady(); // returns promise
// now Catberry has already initialized the entire infrastructure of services
```

Also, you can override existing service registrations, for example, the Logger:

```javascript
cat.locator.register('logger', MyCoolLogger, true);
```

It registers one more implementation of the logger service and Catberry is always using the last registered implementation of every service.

You can also get an access to all registered implementations of any service using `resolveAll()` method. But be careful, if there is no implementation with the specified name the locator throws an error.

Every service's constructor has the only parameter – the service locator itself where you can resolve any other dependency.

*Please keep in mind, that you must avoid circular dependencies they cause an infinite loop*.

Read also:

* [Interface of the Service Locator](https://github.com/catberry/catberry-locator/blob/master/lib/ServiceLocator.js)

Userland Services

* [Logger](#logger)
* [Config](#config)
* [Universal HTTP(S) Request](#uhr-universal-https-request)

## Logger
Catberry has no logger service included to the core but has the API for implementing a logger plugin. You can use any logger you want if create an adapter for it subscribing the logger on several important events in Catberry.

As an example of the implementation, there is a [stupid console logger](https://github.com/catberry/catberry-logger) that is used in all CLI-provided project templates.

Please keep in mind, that if you're not using any logger with Catberry you should handle [process' "uncaughtException"](https://nodejs.org/api/process.html#process_event_uncaughtexception) and [window.onerror](https://developer.mozilla.org/en/docs/Web/API/GlobalEventHandlers/onerror) on you own, otherwise the application will exit on the server and stop executing in a browser when any fatal error occurs.

If you have a project generated by CLI, you have nothing to worry about, all fatal errors will be handled by a default console logger that is included as a Catberry plugin.

## Config
Catberry has a configuration object registered as a "config" service in the [Service Locator](#service-locator).

Just resolve `config` from the Service Locator if you need it.

The service is just a full config object which was passed to the `catberry.create()` method.

Catberry uses the following parameters from it:

* `componentsGlob` – the glob expression for discovering the cat-components, can be a string array or just a string (`['catberry_components/**/cat-component.json','node_modules/*/cat-component.json']` by default).
* `storesGlob` - the glob expression for discovering stores (`**/*.js` by default).
* `storesDirectory` – the relative path to the directory with stores (`./catberry_stores` by default).
* `publicDirectoryPath` – the path to the public directory (`./public` by default).
* `bundleFilename` – the name of the browser bundle file (`bundle.js` by default).

**[↑ back to top](#table-of-contents)**

# Cookie
As you might notice, the store and cat-component contexts have a property `cookie`. In fact, it is a universal wrapper that can `get` or `set` cookie in environment-independent way.

It has following interface:

```javascript
/**
 * Gets a map of cookie values by their names.
 * @returns {Object} The cookies map by their names.
 */
getAll();

/**
 * Gets a cookie value by its name.
 * @param {string} name The cookie name.
 * @returns {string} The cookie value.
 */
get(name);

/**
 * Gets current cookie string.
 * @returns {string} Cookie string.
 */
getCookieString();

/**
 * Sets cookie to this wrapper.
 * @param {Object} cookieSetup Cookie setup object.
 * @param {string} cookieSetup.key Cookie key.
 * @param {string} cookieSetup.value Cookie value.
 * @param {number?} cookieSetup.maxAge Max cookie age in seconds.
 * @param {Date?} cookieSetup.expires Expire date.
 * @param {string?} cookieSetup.path URI path for cookie.
 * @param {string?} cookieSetup.domain Cookie domain.
 * @param {boolean?} cookieSetup.secure Is cookie secured.
 * @param {boolean?} cookieSetup.httpOnly Is cookie HTTP only.
 * @returns {string} Cookie setup string.
 */
set(cookieSetup);
```

**[↑ back to top](#table-of-contents)**

# Template engines
Catberry supports any template engine that has the "precompiling to string" feature.

Officially supported:
* [Dust](https://github.com/catberry/catberry-dust)
* [Handlebars](https://github.com/catberry/catberry-handlebars)
* [Jade](https://github.com/catberry/catberry-jade)

You can also create your own adapter for any template engine, just take a look at the existing one for [Handlebars](https://github.com/catberry/catberry-handlebars).

To set a template engine you just need to register the template provider like this:
```javascript
const handlebars = require('catberry-handlebars');
const cat = catberry.create(config);
handlebars.register(cat.locator);
```

In fact, the [Catberry CLI](#cli) does it for you, see its [readme]([Catberry CLI](https://github.com/catberry/catberry-cli)).

**[↑ back to top](#table-of-contents)**

# Browser bundle
The Catberry application object has a `build` method that is used like following:

```javascript
const catberry = require('catberry');
const cat = catberry.create();
cat.build(); // returns a promise
```

This method can be called in `./server.js` script or separately in different script and process.

It is highly recommended to use the `build` method in a separate process because JavaScript minification requires a lot of memory and it seems like your `./server.js` script uses 1GB of RAM from start, which is not true of course.

For example, you can use a separate `./build.js` script like this:
```
node ./build.js release
```

To build the browser bundle, Catberry uses [browserify](http://browserify.org) which is awesome and can convert your server-side JavaScript to the source code for a browser.

Also, as far as Catberry supports ES6/ES2015 and majority of the browsers don't it uses [Babel](http://babeljs.io/) for converting ES6/ES2015 to ES5. It's used as one of the browserify transformations.

## Including Packages into the browser bundle
There are some rules according to browserify limitations:

* If you want to include a module into the browser bundle it should be required directly via `require('some/path/to/module')`. If the module's path is a variable, browserify will just skip it or throws an error.
* If you want to exclude a server-side package from the browser bundle or replace it with the browser version just use the browserify's `browser` field in the `package.json` file as it is described [here](http://github.com/substack/node-browserify#packagejson).

## Code Watching and Reloading
By default, Catberry works in the debug mode and it means that changing of stores or cat-components in the application's source code automatically rebuilds the browser bundle and reloads the modules on the server.
You can switch the application to release mode passing `isRelease: true` parameter into the config object like this:

```javascript
const catberry = require('catberry');
const cat = catberry.create({isRelease: true});
```

As a summary, the difference between modes is:
* Debug mode - everything is watched for changes, the browser bundle is automatically rebuilt and all the modules are re-initialized on the server.
* Release mode - there is no watch for changes and all source code of the browser bundle is minified using [uglify-js](https://www.npmjs.org/package/uglify-js)

**[↑ back to top](#table-of-contents)**

# Event Bus and Diagnostics
Catberry has a set of events that can be used for diagnostics purpose (by browser extensions, for example). Catberry uses exactly the same events for logging all messages.

There are two ways of listening to a Catberry event:

* Subscribe on it using the Catberry application instance directly like this:

```javascript
const catberry = require('catberry');
const cat = catberry.create();

cat.events.on('error', error => {
	// some action
});
```

* Subscribe on it using the `this.$context` object of a [store](#stores) or
a [cat-component](#cat-components) using the same `on` or `once` methods.


In a browser, you can access the global Catberry application instance:

```javascript
// catberry object is global because it is a property of the window
catberry.events.on('error', error => {
	// some action
});
```

In fact, `cat.events` property has the interface similar to the [EventEmitter](http://nodejs.org/api/events.html#events_class_events_eventemitter).

## Event names and arguments
Here is a list of Catberry events:

| Event					| When happens									| Arguments																									|
|---------------|-------------------------------|-----------------------------------------------------------|
| ready | Catberry has finished the initialization | no |
| error | an error happened | `Error` object |
| storeLoaded | each store is loaded | `{name: String, path: String, constructor: function}` |
| componentLoaded | each component is loaded | `{name: String, properties: Object, constructor: function, template: Object, errorTemplate: Object}` |
| allStoresLoaded | all stores are loaded | Loaded stores by their names |
| allComponentsLoaded | all components are loaded | Loaded components by their names |
| componentRender | Catberry starts rendering a component | `{name: String, context: Object}` |
| componentRendered | Catberry finishes rendering a component | `{name: String, context: Object, hrTime: [number, number], time: Number}` |
| storeDataLoad | Catberry starts loading data from a store | `{name: String}` |
| storeDataLoaded | Catberry finishes loading data from a store | `{name: String, data: Object, lifetime: Number}` |
| actionSend | Catberry sends an action to a store | `{storeName: String, actionName: String, args: Object}` |
| actionSent | An action is sent to a store | `{storeName: String, actionName: String, args: Object}` |
| documentRendered | Catberry finishes rendering all components | The routing context with a location, referrer, userAgent etc. |
| storeChanged | A Catberry application store is changed | Name of the store |
| stateChanged | A Catberry application changed state | `{oldState: Object, newState: Object}` |

List of the server-only events:

| Event				| When happens					| Arguments														|
|-------------|-----------------------|-------------------------------------|
| storeFound | each store is found | `{name: String, path: String}` |
| componentFound | each component is found | `{name: String, path: String, properties: Object}` |
| bundleBuilt | the browser bundle is built | `{hrTime: [number, number], time: Number, path: String}` |

List of the browser-only events:

| Event				| When happens										| Arguments								|
|-------------|---------------------------------|-------------------------|
| documentUpdated | stores are changed and components are re-rendered | `['store1', 'store2']` |
| componentBound | each component is bound |	`{element: Element, id: String}` |
| componentUnbound | each component is unbound |	`{element: Element, id: String}` |

These events can be used for browser extensions, extended logging or by component/store logic (in rare cases), feel free to use them wherever you want but remember if an event has too many subscribers it can cause a performance regression and if you subscribe on events in the server environment you must unsubscribe from these events as well.

**[↑ back to top](#table-of-contents)**

# CLI

Catberry has a Command Line Interface that helps you to start a new project and add new stores and components to it.

To start using Catberry CLI just install it globally from npm:

```
npm -g install catberry-cli
```

And then follow the usage instructions you can find [here](https://github.com/catberry/catberry-cli) or just use the help of the CLI:

```
catberry --help
```

**[↑ back to top](#table-of-contents)**

# Plugin API
The entire Catberry's plugin API is based on the Service Locator and every plugin is just a [service](#catberry-services) registered in the locator.

So, there are several sorts of plugins.

## Store Transformation API
You can register a plugin that applies some transformations to loaded stores. A Promise is supported as a returned value. A plugin can be registered as an instance (`locator.registerInstance`) or as a class/constructor (`locator.register`) like this:

```javascript
locator.registerInstance('storeTransform', {
	transform(store) {
		// store is loaded
		// you can replace values, wrap a constructor, or even build a new object
		return newStore;
	}
);
```

The `store` parameter would be an object like this:
```javascript
{
	name: 'some store name',
	constructor: class StoreClass { }
}
```

## Component Transformation API
You can register a plugin that applies some transformations to loaded components. A Promise is supported as a returned value. A plugin can be registered as an instance (`locator.registerInstance`) or as a class/constructor (`locator.register`) like this:

```javascript
class ComponentTransform {
	constructor(locator) {
		// …
	}
	transform(component) {
		// component is loaded
		// you can replace values, wrap a constructor, or even build a new object
		return Promise.resolve(newComponent);
	}
}

locator.registerInstance('componentTransform', ComponentTransform);
```

The `component` parameter would be an object like this:

```javascript
{
	name: 'nameOfTheComponent',
	constructor: class ComponentClass {},
	// the object from cat-component.json
	// you can store in these files whatever you want and use it in
	// transformations
	properties: {
		name: 'nameOfTheComponent',
		template: './template.hbs',
		logic: 'index.js'
	},
	templateSource: 'compiled template sources here',
	errorTemplateSource: 'compiled error template sources here or null'
}
```

## Post-build Action API
You can register a plugin that does an action after the browser bundle is built. It can be assets building or some post-processing of files. A Promise is supported as a returned value. The plugin can be registered as an instance (`locator.registerInstance`) or as a class/constructor (`locator.register`) like this:

```javascript
locator.registerInstance('postBuildAction', {
	action(storeFinder, componentFinder) {
		// you can get a list of found stores or a list of found components
		// using storeFinder.find() and componentFinder.find() respectively
		// every component object has "properties" field
		// that contains cat-component.json values
		return Promise.resolve();
	}
);
```

`find()` method returns a promise of an object with
stores by their names.

Every `store`, in this case, would be an object like this:

```javascript
{
	name: 'some store name',
	path: 'relative path to a store module'
}
```

Every `component`, in this case, would be an object like this:

```javascript
{
	name: 'nameOfTheComponent',
	path: 'path to a cat-component.json file',
	// the object from cat-component.json
	// you can store whatever you want in these files and use it in
	// transformations
	properties: {
		name: 'nameOfTheComponent',
		template: './template.hbs',
		logic: 'index.js'
	}
}
```

This type of objects above are called descriptors.

Every finder is an [EventEmitter](https://nodejs.org/api/events.html#events_class_events_eventemitter)
and has following events:

Store Finder

* add – a new store has been added to the application
* change – the store's source has been changed
* unlink – the store has been removed from the application
* error – watch error occurs

Every event handler receives a store descriptor as the first parameter.

Component Finder

* add – a new component has been added to the application
* change – the component's folder has been changed (any nested files)
* changeLogic – the component's logic file has been changed
* changeTemplates – the component's template or the error template has been changed
* unlink – the component has been removed from the application
* error – watch error occurs

Every event handler except the `change` event receives a component descriptor as the first parameter, but `change` event handler receives an object with the additional data like this:

```javascript
{
	filename: 'filename of changed file',
	// component descriptor
	component: {
		name: 'nameOfTheComponent',
		path: 'path to a cat-component.json file',
		properties: {
			name: 'nameOfTheComponent',
			template: './template.hbs',
			logic: 'index.js'
		}
	}
}
```

## Browserify transformation and plugin API
You can register a browserify [transformation](https://github.com/substack/node-browserify/wiki/list-of-transforms) or [plugin](https://github.com/substack/node-browserify#plugins).

Both of them can be registered as instances (`locator.registerInstance`) or
as classes/constructors (`locator.register`):

The transformation example:

```javascript
locator.registerInstance('browserifyTransformation', {
  transform(filePath, options) {
    return transformStream;
  },
  options: { /* the transform options will be passed to the browserify */ }
);
```
The plugin example:

```javascript
locator.registerInstance('browserifyPlugin', {
  plugin(bundlerObject, options) {
    return transformStream;
  },
  options: { /* the plugin options will be passed to the browserify */ }
);
```

## List of officially supported plugins

* [catberry-assets](https://github.com/catberry/catberry-assets) – The plugin that builds assets for each component using Gulp
* [catberry-l10n](https://github.com/catberry/catberry-l10n) – The localization plugin
* [catberry-uhr](https://github.com/catberry/catberry-uhr) – The universal HTTP(S) request implementation
* [catberry-logger](https://github.com/catberry/catberry-logger) – The stupid isomorphic console logger
* [catberry-oauth2-client](https://github.com/catberry/catberry-oauth2-client) – The OAuth 2.0 client plugin that allows your stores to work with the RESTful API using OAuth 2.0.

**[↑ back to top](#table-of-contents)**
