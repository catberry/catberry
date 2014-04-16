#Logger

Catberry has an universal logger service registered as "logger" in [Service Locator](https://github.com/pragmadash/catberry-locator/blob/master/README.md) and accessible via dependency injection.

This logger implementation has standard for all loggers methods {trace, warn, info, error, fatal}. Last two supports Error object to be passed as an argument.

Actually when you use this service at server-side code it uses [log4js](https://www.npmjs.org/package/log4js) module inside. It means you can configure it as described [here](https://github.com/nomiddlename/log4js-node) in its README file.

In browser it is implemented as a very simple logger that can write to browser's console.

Implementation:

* Browser: [lib/client/Logger.js](../../lib/client/Logger.js)
* Server: [log4js](https://www.npmjs.org/package/log4js)