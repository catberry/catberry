#Service-Module-Placeholder
If you want to use modules both at server and browser it is obvious that you should implement your business logic somewhere else.
Catberry proposes to use [Service-oriented architecture](http://en.wikipedia.org/wiki/Service-Oriented_Architecture) where every module could work with set of independent services which implements different logic.

So, Catberry Application consist of:

 * Set of services (HTTP servers)
 * Set of modules (more details in [Modules Documentation](modules.md))
 * Set of placeholders (templates which could reference each other)

Typical architecture in common case is presented on image below:

![Catberry Application Architecture](images/smp.png)

You can find example application [here](../example) with architecture is described below:

![Example Application Architecture](images/smp-chat.png)

This approach allow your module to be executed at server and browser as well without any additional logic.
All you need is to use [Universal HTTP Request](services/uhr.md) - this module implements HTTP request logic using jQuery AJAX in browser and http.request at server but has the same interface.