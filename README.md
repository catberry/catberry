# Catberry

[![Build Status](https://travis-ci.org/catberry/catberry.svg?branch=master)](https://travis-ci.org/catberry/catberry) [![codecov.io](http://codecov.io/github/catberry/catberry/coverage.svg?branch=master)](http://codecov.io/github/catberry/catberry?branch=master)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/catberry/main?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)

<p align="center">
  <img src="https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png" />
</p>

## What the cat is that?

Catberry was developed to help create ["isomorphic/Universal" Web applications](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#isomorphicuniversal-applications).

Long story short, isomorphic/universal applications are apps that use the same codebase on both the server and client environments to render what the client would see as a "[Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application)".

## TLDR;

Install [Catberry CLI](https://www.npmjs.com/package/catberry-cli) using following command:

```bash
npm install -g catberry-cli
```

Use Catberry CLI to create an empty project with [Handlebars](http://handlebarsjs.com/) support like this:

```bash
catberry init empty-handlebars
```

Or an example application that works using GitHub API:

```bash
catberry init example
```

Also, you can get a list of all templates:

```bash
catberry init ?
```

## Useful links

* [Catberry Documentation](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md)
* [Get Started Guide](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#get-started)
* [Plugins and Tools](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#plugins-and-tools)
* [Catberry's homepage](https://catberry.github.io/)
* [Todo application](https://github.com/catberry/catberry-todomvc)
* [Example application](https://github.com/catberry/catberry-example)

## Why should I use that?

### Architecture

* The entire architecture of the framework is built using the [Service Locator](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#service-locator) pattern – which helps to manage module dependencies and [create plugins](https://github.com/catberry/catberry/) – and [Flux](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#flux), for the data layer
* [Cat-components](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#cat-components) – similar to [web-components](http://webcomponents.org/) but organized as directories, can be rendered on the server and published/installed as NPM packages
* Catberry builds a bundle for running the application in a browser as a [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application)
* [ES2015/ES6 support](https://nodejs.org/en/docs/es6/) – native on the server/Node.js and using [Babel](http://babeljs.io/) for a browser
* The whole framework's API uses [Promises](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise)
* Framework itself is an [express](https://github.com/visionmedia/express)/[connect](https://github.com/senchalabs/connect) middleware, which means you can use it with other [middlewares](http://expressjs.com/en/guide/using-middleware.html)

### Rendering

* Fast and efficient [progressive rendering engine](http://www.phpied.com/progressive-rendering-via-multiple-flushes/) based on
[node.js streams](http://nodejs.org/api/stream.html#stream_api_for_stream_implementors) on the server
* Browser rendering does not block the [Event Loop](https://developer.mozilla.org/en/docs/Web/JavaScript/EventLoop), which means your app's UI will never be frozen
* [Handlebars](https://github.com/catberry/catberry-handlebars), [Dust](https://github.com/catberry/catberry-dust) and
[Pug](https://github.com/catberry/catberry-pug) template engines are [officially supported](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md#template-engines) (and you can implement your own provider to support any other)
* Efficient DOM event listening using [event delegation](http://davidwalsh.name/event-delegate)

For more details please proceed to [Catberry Documentation](https://github.com/catberry/catberry/blob/9.0.0/docs/index.md).

### Typical Cat-component example

```javascript
'use strict';

class CoolComponent {

	/**
	 * Creates a new instance of the "CoolComponent" component.
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
			// CSS selector
			'.clickable': () => window.alert('Ouch!');
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

The component is used as a custom tag:

```html
<cat-cool id="unique-value" cat-store="group/CoolStore"></cat-cool>
```

### Typical Store example

```javascript
'use strict';

class CoolStore {
	/**
	 * Creates a new instance of the "CoolStore" store.
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
		// Here you can call this.$context.changed() if you're sure'
		// that the remote data on the server has been changed.
		// You can additionally have many handle methods for other actions.
	};
}

module.exports = Some;
```

## Browser Support
While Catberry is capable of rendering pages for any browser on the server, due to the use of certain HTML5 features, like the [History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history), only partial support of old browsers is possible for the client-side JavaScript application.

The main goal of the Catberry Framework is to use the full power of new technologies and provide a user with the best possible experience.

In fact, a user gets an HTML page from the server only once and all the rest of the time the whole page is changing in a browser receiving only pure data from API service(s) used with the application.

Thanks to Catberry's progressive rendering engine, user receives a page from the server component by component as fast as each component renders its template not waiting for the whole page is built.

Catberry supports 2 last versions of modern browsers and IE 11. It depends on Babel [babel-preset-env](https://github.com/babel/babel-preset-env) preset which config you can override putting a `.babelrc` file in your project.

## Contributing

There are a lot of ways to contribute into Catberry:

* Give it a star
* Join the [Gitter](https://gitter.im/catberry/main) room and leave a feedback or help with answering users' questions
* [Submit a bug or a feature request](https://github.com/catberry/catberry/issues)
* [Submit a PR](https://github.com/catberry/catberry/blob/9.0.0/CONTRIBUTING.md)
* If you like the logo, you might want to buy a Catberry [T-Shirt](http://www.redbubble.com/people/catberryjs/works/14439373-catberry-js-framework-logo?p=t-shirt) or a [sticker](http://www.redbubble.com/people/catberryjs/works/14439373-catberry-js-framework-logo?p=sticker)

Denis Rechkunov <denis.rechkunov@gmail.com>
