#Catberry [![Build Status](https://travis-ci.org/pragmadash/catberry.png?branch=master)](https://travis-ci.org/pragmadash/catberry)

[![NPM](https://nodei.co/npm/catberry.png)](https://nodei.co/npm/catberry/)

![Catberry](docs/images/logo.png)

##What is it?
Catberry is a framework for fast and modular web-applications. Main feature you will get using Catberry is ability to write module once and use it at server and browser without any additional logic, just create module, put it to folder "catberry_modules" and start. Catberry builds client script bundle and re-use your modules in browser automatically providing Single Page Application using browser History API if it is supported.

##Advantages
* Super fast rendering engine using streams without in-memory template rendering (powered by [dustjs](https://github.com/linkedin/dustjs))
* You write code in server-side style and only once for both server-side and client-side execution
* You get automatically [Single Page Application](http://en.wikipedia.org/wiki/Single_Page_Application) and back-end which renders identical page for search engines and shared links
* You get such module API which allows you to develop different blocks on page independently and use one code on server and client for rendering templates
* Every link click on page could raise event in you module automatically if you define "data-event" attribute
* URL hash change event is raised like an event in module automatically (two event on hash set and remove)
* Your application builds itself without any additional actions on startup using gulp and browserify (debug and release modes are supported)
* All framework architecture is built using [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection)
* You could register own modules (services) in [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) and inject it into any module you want
* Framework itself is a [connect](https://github.com/senchalabs/connect)/[express](https://github.com/visionmedia/express) middleware it means you could use it with any other middleware
* All page state is described by URL with GET query string in format "moduleName_parameterName=value" and hash "moduleName_parameterName" or without module name prefix which means global parameter or event. This approach guarantees that your page is rendered identically from server and using History API in browser.
* Very flexible [URL mapping engine](docs/url-mapping.md) which allows to use short human-understandable URLs instead big URL with a lot of GET parameters
* New concept of application architecture is called [Service-Module-Placeholder](docs/smp.md) instead Model-View-Controller. SMP is much easier and faster to implement.
* Very simple [Module API](docs/modules.md)

For more details please proceed to [Catberry Documentation](docs/index.md).

Also you can see [example](example/) or install it from npm:

```bash
npm install catberry-example
```

##Contribution
If you have found a bug, please create pull request with mocha unit-test which reproduces it or describe all details in issue if you can not implement test.
If you want to propose some improvements just create issue or pull request but please do not forget to use **npm test** to be sure that you code is awesome.

All changes should satisfy this [Code Style Guide](docs/code-style.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>
