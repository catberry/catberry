#Catberry CLI

[![NPM](https://nodei.co/npm/catberry-cli.png)](https://nodei.co/npm/catberry-cli/)

![Catberry](https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png)

##What is it?
This is command line interface for [Catberry Framework](https://github.com/catberry/catberry) 
that helps to create projects and modules.

It helps to:

###Create Catberry Application using project template 

```bash
catberry init [--dest=directory] <template>
```

Included templates:
* `example` - finished project that works with GitHub API and demonstrates
how to implement such isomorphic application using Catberry Framework
* `empty` - empty project that helps to start a new project using Catberry
	 
###Add module to project using module preset
 
```bash
catberry add [--dest=directory] <moduleName>
```

##Installation

```bash
npm -g install catberry-cli
```

To get more usage details `catberry --help`

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/master/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>