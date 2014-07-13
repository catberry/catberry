#Logger

Catberry has an universal logger service registered as "logger" in 
[Service Locator](../service-locator.md) and accessible via 
[dependency injection](../dependency-injection.md).

This logger implementation has standard for all loggers methods 
{trace, warn, info, error, fatal}. 
Last two supports Error object to be passed as an argument.

Actually when you use this service at server it uses 
[log4js](https://www.npmjs.org/package/log4js) module inside. 
It means you can configure it as described [here]
(https://github.com/nomiddlename/log4js-node) in its README file.

In browser it is implemented as a very simple logger that can only write 
to browser's console.

Read next:

Userland Services

* [Universal HTTP(S) Request](universal-http-request.md)
* [Logger](logger.md)
* [Template Provider](template-provider.md)

#Interface

* Browser: [/lib/client/Logger.js](../../../lib/client/Logger.js)
* Server: [log4js](https://www.npmjs.org/package/log4js)
