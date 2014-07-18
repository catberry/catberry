#Isomorphic Applications

There is an awesome [post in airbnb technical blog]
(http://nerds.airbnb.com/isomorphic-javascript-future-web-apps/) 
about the idea of isomorphic JavaScript applications and what exactly it is.
Also you can find video [Spike Brehm: Building Isomorphic Apps]
(http://www.youtube.com/watch?v=CH6icJbLhlI)
from JSConf 2014 talks.

Simply speaking, isomorphic applications are built to make it possible 
to write module once and use it for both page rendering on server 
(for SEO and some shared links) and in browser with no server side at all.
It means on server your modules are executing the same code as 
in browser. This [Single Page Application]
(http://en.wikipedia.org/wiki/Single_Page_Application) 
can re-render all parts of the page using the same isomorphic modules and not 
reloading the page at all.

Isomorphic applications can work with set of independent services that 
implement some business logic (Facebook API, Twitter API etc).
In fact, each module in isomorphic application should receive all data from 
API server which could be written in any platform you want using REST approach.

There is a list of problems which are solved by isomorphic applications:

* *Using single page applications causes SEO problems*. Your isomorphic
modules will render exactly the same page on server as it is in browser
* *Code duplication for rendering parts of the page at server and in browser, 
sometimes it even written in different programming languages*. 
Since isomorphic modules are written only once and in JavaScript 
you do not have this problem.
* *Maintenance is complicated, because you need to synchronize changes 
in server-side and browser modules*. Obviously, you do not need this
using isomorphic modules. It is always one module to change.
* *Overhead connected with rendering all pages on server*. Since clients 
receive a page from server only once and then render all other pages in 
their browsers your server's load will be reduced dramatically.
 
And maybe a lot of more, who knows.

Technologies such History API and node.js make this type 
of applications possible and we should use this possibility.  

Read next:

* [Introducing Catberry](introducing-catberry.md)
