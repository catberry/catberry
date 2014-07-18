'use strict';

var catberry = require('catberry'),
	config = require('./config/client.json'),
	cat = catberry.create(config);

cat.startWhenReady();
