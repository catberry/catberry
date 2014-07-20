#Catberry Example Project

![Catberry](https://raw.githubusercontent.com/catberry/catberry/master/docs/images/logo.png)

##How to use
This is simple web-application that works with [GitHub API](http://developer.github.com/) 
and demonstrates how to build isomorphic web-application using 
[Catberry Framework](https://github.com/catberry/catberry).

First of all it is needed to install dependencies:

```
npm install
```

Then to start in `debug` mode without script minification and with file watch:

```
npm run debug
```

To start in `release` mode:

```
npm start
```

##Contribution
If you have found a bug, please create pull request with [mocha](https://www.npmjs.org/package/mocha) 
unit-test which reproduces it or describe all details in issue if you can not 
implement test. If you want to propose some improvements just create issue or 
pull request but please do not forget to use `npm test` to be sure that your 
code is awesome.

All changes should satisfy this [Code Style Guide](https://github.com/catberry/catberry/blob/master/docs/code-style-guide.md).

Also your changes should be covered by unit tests using [mocha](https://www.npmjs.org/package/mocha).

Denis Rechkunov <denis.rechkunov@gmail.com>