#Isomorphic Applications

There is an awesome [post in airbnb technical blog]
(http://nerds.airbnb.com/isomorphic-javascript-future-web-apps/) 
about idea of isomorphic JavaScript applications and what exactly it is.
Also you can find video [Spike Brehm: Building Isomorphic Apps]
(http://www.youtube.com/watch?v=CH6icJbLhlI)
from JSConf 2014 talks.

If say shortly, isomorphic applications are built such way that makes possible 
to write module one time and use it for page rendering on server 
(for SEO and some shared links) and in browser without work of server at all.
It means on server your modules executing the same code as in browser and in 
browser you have [Single Page Application]
(http://en.wikipedia.org/wiki/Single_Page_Application) 
that can re-render all parts of page using the same isomorphic modules 
and not reloading the page at all.

In isomorphic applications your business logic, of course, should be implemented 
somewhere else, outside of these modules, because it can not work in browser. 
In fact, every module in isomorphic application should receive all data from 
API server which could be written in any platform you want using REST approach.

There is a list of problems are solved by isomorphic applications:

* Using single page applications without SEO problems. Your isomorphic
modules will render exactly the same page on server as it is rendered 
in browser
* Code duplication for rendering parts of page at server and in browser, 
sometimes it even written in different programming languages. 
Since isomorphic modules are written only once and in JavaScript 
you do not have this problem.
* Maintenance is complicated, because you need to synchronize changes 
in server-side and browser modules. It is obviously that you do not need this
using isomorphic modules. It is always one module to change.
* High load on server. Since server clients render and receive page from 
server only once and then render all other pages in their browsers 
your server's load will be reduced dramatically.
 
And maybe a lot of more, who knows.

Technologies such History API and node.js make this type 
of applications possible and we just must use this possibility.  

Read next:

* [Introducing Catberry](introducing-catberry.md)