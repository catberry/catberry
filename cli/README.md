#Catberry CLI

[![NPM](https://nodei.co/npm/catberry-cli.png)](https://nodei.co/npm/catberry-cli/)

![Catberry](https://raw.githubusercontent.com/pragmadash/catberry/master/docs/images/logo.png)

##What is it?
This is command line utility for creation of project based on 
[Catberry Framework](https://github.com/pragmadash/catberry).

It can:

* Create Catberry Application using project template 
`catberry init [--dest=directory] <template>`
* Add module to current Catberry Application using module template 
`catberry module <name>`

##Installation

`npm -g install catberry-cli`

To get more usage details `catberry --help`

##Contribution
If you have found a bug, please create pull request with [mocha]
(https://www.npmjs.org/package/mocha) unit-test which reproduces it or describe 
all details in issue if you can not implement test. If you want to propose some 
improvements just create issue or pull request but please do not forget to use 
`npm test` to be sure that your code is awesome.

All changes should satisfy this [Code Style Guide]
(docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha]
(https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>