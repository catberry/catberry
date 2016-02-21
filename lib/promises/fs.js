'use strict';

const fs = require('fs');
const helper = require('./promiseHelper');

module.exports = {
	exists: toCheck => new Promise(fulfill => fs.exists(toCheck, isExists => fulfill(isExists))),
	makeDir: helper.callbackToPromise(fs.mkdir),
	readFile: helper.callbackToPromise(fs.readFile),
	writeFile: helper.callbackToPromise(fs.writeFile),
	unlink: helper.callbackToPromise(fs.unlink)
};
