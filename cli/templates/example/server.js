'use strict';

var catberry = require('catberry'),
	isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined;

var http = require('http'),
	path = require('path'),
	publicPath = path.join(__dirname, 'public'),
	connect = require('connect'),
	config = require('./config/server.json'),
	cat = catberry.create(config),
	app = connect();

config.publicPath = publicPath;
config.isRelease = isRelease === undefined ? config.isRelease : isRelease;

// turn on GZIP when in release mode
if (isRelease) {
	var compression = require('compression');
	app.use(compression());
}

var serveStatic = require('serve-static');
app.use(serveStatic(publicPath));

app.use(cat.getMiddleware());

var errorhandler = require('errorhandler');
app.use(errorhandler());

http
	.createServer(app)
	.listen(config.server.port || 3000);