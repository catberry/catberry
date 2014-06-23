#Catberry [![Build Status](https://travis-ci.org/pragmadash/catberry.png?branch=master)](https://travis-ci.org/pragmadash/catberry)

[![NPM](https://nodei.co/npm/catberry.png)](https://nodei.co/npm/catberry/)

![Catberry](https://raw.githubusercontent.com/pragmadash/catberry/master/docs/images/logo.png)

##What is it?
Catberry is a framework for fast and modular web-applications. Main feature you will get using Catberry is ability to write module once and use it at server and browser without any additional logic, just create module, put it to folder "catberry_modules" and start. Catberry builds client script bundle and re-uses your modules in browser automatically providing Single Page Application using browser History API if it is supported.

##Advantages
* Super fast rendering engine using streams without in-memory template rendering (powered by [dustjs](https://github.com/linkedin/dustjs))
* You write code in server-side style and only once for both server-side and client-side execution
* You get automatically [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application) and back-end which renders identical page for search engines and shared links
* You get such module API which allows you to develop different blocks on page independently and use one code on server and client for rendering templates
* Every link click on page raises event in your module automatically if you define "data-event" attribute
* URL hash change event is raised like an event in module automatically (two event on hash set and remove)
* Your application builds version of itself for browser using browserify (debug and release modes are supported)
* All framework architecture is built using [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection)
* You can register your own modules (services) in [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) and inject it into any module you want
* Framework itself is a [connect](https://github.com/senchalabs/connect)/[express](https://github.com/visionmedia/express) middleware it means you could use it with any other middleware
* Routing definition using "/some/:parameter[module1,module2,module3]" syntax with list of modules that will receive parameter value. Anyway regular expression are supported too.
* New concept of application architecture is called [Service-Module-Placeholder](https://github.com/pragmadash/catberry/blob/master/docs/smp.md) instead Model-View-Controller. SMP is much easier and faster to implement.
* Very simple [Module API](https://github.com/pragmadash/catberry/blob/master/docs/modules.md)

For more details please proceed to [Catberry Documentation](https://github.com/pragmadash/catberry/blob/master/docs/index.md).

Also you can see [example](https://github.com/pragmadash/catberry/tree/master/example) or install it from npm:

```bash
npm install catberry-example
```

##Browser support
Catberry uses [ECMAScript 5](http://www.ecma-international.org/ecma-262/5.1/) and some HTML5 features 
like [History API](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history)
therefore it does not support old browsers at all.
The main goal for Catberry is to use full power of new technologies and provide user with best experience.

Actually user gets HTML page from server only once and all the rest of the time whole page is rendered in browser receiving only pure data from API server.
Thanks to Catberry's very fast page rendering engine, user receives refreshed page as fast as API server could provide data for it.

All supported browsers are listed below:

| Browser			| Version		|
|-------------------|---------------|
| IE				| 10+			|
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
* [catberry-module](https://www.npmjs.org/package/catberry-module) - Basic module implementation
* [catberry-l10n](https://www.npmjs.org/package/catberry-l10n) - Localization support
* [catberry-lazy-loader](https://www.npmjs.org/package/catberry-lazy-loader) - Module for implementing feed placeholders with infinite scroll and lazy loading

And even [more modules](https://www.npmjs.org/search?q=catberry).

##Contribution
If you have found a bug, please create pull request with mocha unit-test which reproduces it or describe all details in issue if you can not implement test.
If you want to propose some improvements just create issue or pull request but please do not forget to use **npm test** to be sure that you code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/pragmadash/catberry/blob/master/docs/code-style.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>
