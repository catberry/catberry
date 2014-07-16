'use strict';

module.exports = MainModule;

var	util = require('util'),
	ModuleBase = require('catberry-module');

util.inherits(MainModule, ModuleBase);

function MainModule(title) {
	ModuleBase.call(this);
}