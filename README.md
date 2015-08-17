# Catberry

[![Build Status](https://travis-ci.org/catberry/catberry.png?branch=master)](https://travis-ci.org/catberry/catberry) [![codecov.io](http://codecov.io/github/catberry/catberry/coverage.svg?branch=master)](http://codecov.io/github/catberry/catberry?branch=master)
[![Gitter](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/catberry/catberry?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=body_badge)

[![NPM](https://nodei.co/npm/catberry.png)](https://nodei.co/npm/catberry/)

<p align="center">
  <img src="https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png" />
</p>

Catberry was developed to help in creating ["isomorphic" Web applications](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#isomorphic-applications).
Isomorphic applications are apps that use the same codebase to run from both
server and client-side environments.

This means you write the code only once, and deploy it the way you want.
Catberry handles all the differences between these two environments.

You will get
[Single Page Application](http://en.wikipedia.org/wiki/Single-page_application) 
using browser's
[History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).
And back-end that renders exactly the same page on the server.

Here you can find full
[Catberry Documentation](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md).

To get started with an example, please proceed to
[Get Started Guide](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#get-started).

If you want to try TodoMVC application, proceed to [this link](https://github.com/catberry/catberry-todomvc).

## Advantages
* [Flux](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#flux) architecture
* [Cat-components](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#cat-components) (like [web-components by Google](http://webcomponents.org/) but isomorphic)
* You do not need to write any code for registration or definition of
[cat-components](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#cat-components) or
[stores](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#stores),
Catberry discovers them automatically on startup
* Fast and efficient server-side [progressive rendering engine](http://www.phpied.com/progressive-rendering-via-multiple-flushes/) based on
[node.js streams](http://nodejs.org/api/stream.html#stream_api_for_stream_implementors)
* [Dust](https://github.com/catberry/catberry-dust),
[Handlebars](https://github.com/catberry/catberry-handlebars) and
[Jade](https://github.com/catberry/catberry-jade) template engines
* No Virtual DOM – you can use any other library with Catberry without conflicts
* Efficient DOM event listening using [event delegation](http://davidwalsh.name/event-delegate)
are officially supported (and you can implement own provider for others)
* You will get [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application)
automatically
* You will get back-end that renders exactly the same page for search engines
and shared links
* You will write code in the server-side style
(using [node modules system](http://nodejs.org/api/modules.html#modules_modules)) and [npm](https://www.npmjs.org/)
* Entire architecture of the framework is built using
[Service Locator](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#service-locator)
pattern and 
[Dependency Injection](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md#dependency-injection)
* Framework itself is an
[express](https://github.com/visionmedia/express)/[connect](https://github.com/senchalabs/connect) 
middleware, it means you can use it with any other middlewares

For more details please proceed to [Catberry Documentation](https://github.com/catberry/catberry/blob/6.0.0/docs/index.md).

Also, you can see [finished example application](https://github.com/catberry/catberry-cli/tree/master/templates/example).

## Browser Support
Catberry uses [ECMAScript 5](http://www.ecma-international.org/ecma-262/5.1/) 
and some HTML5 features like [History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history)
therefore it does not support old browsers at all. Catberry can render pages
for any browser at the server, but Catberry's browser script does not work
as [SPA](http://en.wikipedia.org/wiki/Single-page_application) in old browsers.

The main goal of Catberry Framework is to use the full power of new technologies
and provide user with the best experience.

Actually a user gets HTML page from the server only once and all the rest of the time
the whole page is rendered in a browser receiving only pure data from some
API service(s). Thanks to Catberry's very fast page rendering engine, 
user receives refreshed page as fast as API server could provide data for it.

All supported browsers are listed below:

| Browser			| Version		|
|-------------------|---------------|
| IE				| 9 (partial non-[SPA](http://en.wikipedia.org/wiki/Single-page_application)), 10+	|
| IE Mobile			| 10+			|
| Firefox 			| 4+			|
| Firefox Android	| 29+			|
| Chrome			| 19+			|
| Chrome Android	| 35+			|
| Android Browser	| 2.2+, 4.2+	|
| Safari			| 6+			|
| iOS Safari		| 5+			|
| Opera				| 12+			|
| Opera Mobile		| 11.1+			|
| Blackberry Browser| 7+			|

## Contributing

There are a lot of ways to contribute into Catberry:

* Give it a star
* Join the [Gitter](https://gitter.im/catberry/catberry) room and leave a feedback or help with answering users' questions
* [Submit a bug or a feature request](https://github.com/catberry/catberry/issues)
* [Submit a PR](https://github.com/catberry/catberry/blob/6.0.0/CONTRIBUTING.md)
* If you like the logo, you might want to buy a Catberry [T-Shirt](http://www.redbubble.com/people/catberryjs/works/14439373-catberry-js-framework-logo?p=t-shirt) or a [sticker](http://www.redbubble.com/people/catberryjs/works/14439373-catberry-js-framework-logo?p=sticker)

Denis Rechkunov <denis.rechkunov@gmail.com>