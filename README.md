#Catberry [![Build Status](https://travis-ci.org/catberry/catberry.png?branch=master)](https://travis-ci.org/catberry/catberry) [![Coverage Status](https://coveralls.io/repos/catberry/catberry/badge.png?branch=develop)](https://coveralls.io/r/catberry/catberry?branch=develop)

[![NPM](https://nodei.co/npm/catberry.png)](https://nodei.co/npm/catberry/)

![Catberry](https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png)

##What is it?
Catberry is a framework for fast and modular  
[isomorphic web-applications](https://github.com/catberry/catberry/blob/2.1.5/docs/index.md#isomorphic-applications) written in 
JavaScript using [node.js](http://nodejs.org). 

Catberry makes possible to write module once and use it at server and in browser
without any additional code, just create module and put it to folder 
`catberry_modules`. Catberry builds browser script bundle and re-uses your 
modules in browser: automatically creates 
[Single Page Application](http://en.wikipedia.org/wiki/Single-page_application) 
using browser 
[History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).

Here you can find full 
[Catberry Documentation](https://github.com/catberry/catberry/blob/2.1.5/docs/index.md).

To get started with example please proceed to 
[this link](https://github.com/catberry/catberry-cli).

##Advantages
* Super fast rendering engine using 
[node.js streams](http://nodejs.org/api/stream.html#stream_api_for_stream_implementors) 
without in-memory template rendering (powered by [dustjs](https://github.com/catberry/catberry-dust))
* You will write code in server-side style 
(using [node modules system](http://nodejs.org/api/modules.html#modules_modules)) 
and only once to execute it at server and in browser
* You will get [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application) 
automatically and back-end that renders identical page for search engines 
and shared links
* You will get such module API that allows you to develop different independent 
blocks on page and refresh only changed blocks in browser
* A click on link with `href` in bounds of Catberry application rebuilds page
structure in browser without reloading of page
* A click on button or link with `data-event` attribute or hash in `href` 
raises an event in your modules automatically. Manual hash changing does the same thing.
* Your application builds javascript bundle for browser using 
[browserify](http://browserify.org) (debug and release modes are supported)
* All framework architecture is built using 
[Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) 
pattern and 
[Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection)
* You can register your own components (services) in 
[Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) and 
inject it into any module you want
* Framework itself is a 
[connect](https://github.com/senchalabs/connect)/[express](https://github.com/visionmedia/express) 
middleware, it means you can use it with any other middlewares
* Definition of routing rules are specified using 
`/some/:parameter[module1,module2,module3]` syntax with list of modules that 
will receive parameter's value. Anyway regular expressions are supported too.
* Definitions of event routing rules are specified using 
`someHashOrDataEvent:parameter->eventName[module1,module2,module3]` 
syntax with list of modules that will receive event and its parameters.
* New concept of application architecture is called 
[Service-Module-Placeholder](https://github.com/catberry/catberry/blob/2.1.5/docs/index.md#service-module-placeholder) 
instead of Model-View-Controller. 
SMP is the right concept for [isomorphic web-applications](https://github.com/catberry/catberry/blob/2.1.5/docs/index.md#isomorphic-applications).

For more details please proceed to [Catberry Documentation](https://github.com/catberry/catberry/blob/2.1.5/docs/index.md).

Also you can see [finished example application](https://github.com/catberry/catberry-cli/tree/master/templates/example).

##Browser support
Catberry uses [ECMAScript 5](http://www.ecma-international.org/ecma-262/5.1/) 
and some HTML5 features like [History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history)
therefore it does not support old browsers at all.
The main goal of Catberry Framework is to use full power of new technologies 
and provide user with best experience.

Actually user gets HTML page from server only once and all the rest of the time 
whole page is rendered in browser receiving only pure data from some 
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

##Not included packages
* [catberry-l10n](https://www.npmjs.org/package/catberry-l10n) - 
Localization support
* [catberry-lazy-loader](https://www.npmjs.org/package/catberry-lazy-loader) - 
Module for implementing feed placeholders with infinite scroll and lazy loading

And even [more packages](https://www.npmjs.org/search?q=catberry).

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/2.1.5/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>