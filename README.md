#Catberry [![Build Status](https://travis-ci.org/catberry/catberry.png?branch=master)](https://travis-ci.org/catberry/catberry) [![Coverage Status](https://coveralls.io/repos/catberry/catberry/badge.png?branch=develop)](https://coveralls.io/r/catberry/catberry?branch=develop)

[![NPM](https://nodei.co/npm/catberry.png)](https://nodei.co/npm/catberry/)

![Catberry](https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png)

Catberry was developed to help in creating ["isomorphic" Web applications](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md#isomorphic-applications).
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
[Catberry Documentation](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md).

To get started with example please proceed to 
[this link](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md#get-started).

##Advantages
* [Flux](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md#flux) architecture
* [Cat-components](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md#cat-components) (like [web-components by Google](http://webcomponents.org/) but isomorphic)
* Fast server-side [progressive rendering engine](http://www.phpied.com/progressive-rendering-via-multiple-flushes/) based on
[node.js streams](http://nodejs.org/api/stream.html#stream_api_for_stream_implementors)
* No Virtual DOM – you can use any other library with Catberry without conflicts
* Efficient DOM event listening using event delegation
* [Dust](https://github.com/catberry/catberry-dust),
[Handlebars](https://github.com/catberry/catberry-handlebars) and
[Jade](https://github.com/catberry/catberry-jade) template engines
are officially supported (and you can implement own provider for others)
* You will get [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application)
automatically
* You will get back-end that renders exactly the same page for search engines
and shared links
* You will write code in server-side style
(using [node modules system](http://nodejs.org/api/modules.html#modules_modules))
* Entire architecture of framework is built using
[Service Locator](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md#service-locator)
pattern and 
[Dependency Injection](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md#dependency-injection)
* Framework itself is a 
[express](https://github.com/visionmedia/express)/[connect](https://github.com/senchalabs/connect) 
middleware, it means you can use it with any other middlewares

For more details please proceed to [Catberry Documentation](https://github.com/catberry/catberry/blob/4.0.0/docs/index.md).

Also you can see [finished example application](https://github.com/catberry/catberry-cli/tree/master/templates/example).

##Browser Support
Catberry uses [ECMAScript 5](http://www.ecma-international.org/ecma-262/5.1/) 
and some HTML5 features like [History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history)
therefore it does not support old browsers at all. Catberry can render pages
for any browser at the server but Catberry's browser script does not work
as [SPA](http://en.wikipedia.org/wiki/Single-page_application) in old browsers.

The main goal of Catberry Framework is to use the full power of new technologies
and provide user with the best experience.

Actually user gets HTML page from server only once and all the rest of the time 
the whole page is rendered in browser receiving only pure data from some
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

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in an issue if you can not
implement test. If you want to propose some improvements just create an issue or
a pull request but please do not forget to use `npm test` to be sure that your
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/4.0.0/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>