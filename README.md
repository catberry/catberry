#Catberry
##Web-framework and connect middleware for fast modular back/front-end web-applications based on isomorphic JavaScript and  node.js

###What I've got?
* First of all it's fast, because uses own stream-powered page template rendering engine. It means client will start receiving of response data as soon as possible when first chunks of data is ready. While some module does long-time operations your browser will be receiving other resources specified in head fo page (scripts, CSS, images).
* Catberry framework uses [dustjs](https://github.com/linkedin/dustjs) template engine improved by LinkedIn. It implements stream interface therefore all content will be streamed into client browser immediately.
* It supports [Service Locator](http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and [Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection). It means your can easy override any catberry's core module implementation with your own and inject all your additional modules and config parameters into constructors.
* It provides very simple module API for both server-side and client-side usage of the same module.
* We care about code style and quality: whole code base is commented with jsDoc and according one code style.
* We care about stability, every finished module is covered by unit-tests.

###How To
Many examples and tutorials will be soon.