#Introducing Catberry

Catberry is a framework for [Isomorphic Applications]
(isomorphic-applications.md). Also it is a [connect]
(https://github.com/senchalabs/connect)/[express]
(https://github.com/visionmedia/express) middleware.

It makes possible to write modules that on the one hand will be used for 
rendering at the server side for SEO purposes and shared links, 
and on the other hand for rendering in browser for [Single Page Application]
(http://en.wikipedia.org/wiki/Single_Page_Application).

A lot of features are also described in [read me](../README.md) and 
there is a list of most important advantages which your isomorphic application 
receives using Catberry:

* Server-side rendering is stream-based, it means user will see a page
immediately and do not need to wait until all requests to API will be finished.
* Application consists of independent modules. Page consist of placeholders and 
every module controls a group of such placeholders. 
Make and combine placeholders in modules as you want
* Every placeholder is a [dustjs](https://github.com/linkedin/dustjs) template 
with all advantages of this streaming template engine 
* Routing engine supports parsing of parameters from URLs and map it 
to state object in the module. URL and state are automatically synchronized 
in browser and at server as well
* Caching data that was rendered in placeholders
* Every module can set cookies, do HTTP(S) requests, redirect to another 
location in the same way as at server as in browser
* Every module can handle link clicks and hash changes with passing arguments 
in a very simple way
* Every module can receive submitted form and, for example, pass its data to API
* Whole module API is built using [promises](https://www.promisejs.org/). 
Promise is a main approach for working with asynchronous operations in Catberry
application.
 
You can read a lot about additional features in other documentation sections.
 
Read next:
 
* [Service-Module-Placeholder](service-module-placeholder.md)