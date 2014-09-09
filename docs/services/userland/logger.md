#Logger

Catberry has an universal logger service registered as "logger" in 
[Service Locator](../service-locator.md) and accessible via 
[dependency injection](../dependency-injection.md).

Just inject `$logger` into your module or resolve it from 
Service Locator to use this service.

This logger implementation has standard for all loggers methods 
{trace, warn, info, error, fatal}. 
Last two supports Error object to be passed as an argument.

Actually when you use this service at server it uses 
[log4js](https://www.npmjs.org/package/log4js) module inside. 
It means you can configure it as described [here]
(https://github.com/nomiddlename/log4js-node) in its README file.

In browser it is implemented as a very simple logger that can only write 
to browser's console.

##Configuration
To configure browser logger you should just set parameter object `logger` in 
Catberry config object.

Like this for browser logger:
```json
{
	"logger": {
		"levels": "warn,error"
	}
}
```

To configure server logger you have to do more actions:
```javascript
var log4js = require('log4js'); 
//console log is loaded by default, so you won't normally need to do this
//log4js.loadAppender('console');
log4js.loadAppender('file');
//log4js.addAppender(log4js.appenders.console());
log4js.addAppender(log4js.appenders.file('logs/cheese.log'), 'cheese');

var logger = cat.locator.resolve('logger');
logger.setLevel('ERROR');
```

More details [here](https://github.com/nomiddlename/log4js-node#usage).

#Interface

* Browser: [./lib/client/Logger.js](../../../browser/Logger.js)
* Server: [log4js](https://www.npmjs.org/package/log4js)

Read also:

* [Config](config.md)
* [jQuery](jquery.md)
* [Universal HTTP(S) Request](universal-http-request.md)
* [Dust](dust.md)