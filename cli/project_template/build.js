'use strict';

var isRelease = process.argv.length === 3 ?
		process.argv[2] === 'release' : undefined,
	catberry = require('catberry'),
	cat = catberry.create({isRelease: isRelease});

cat.build();
