## Code Style
Catberry follows its own [Code Style Guide](https://github.com/catberry/catberry/blob/5.4.3/docs/code-style-guide.md) 
which is actually similar with [Airbnb style guide](https://github.com/airbnb/javascript/tree/master/es5) except several moments.

Please do not forget to use `npm test` to be sure that your code is awesome. 

## Tests
Catberry uses [mocha](https://www.npmjs.org/package/mocha) and some rules:

* The `test` directory structure copies the actual structure of the project 
* The test's `describe` call should contain the Constructor 
and prototype's method name:
```javascript
describe('lib/finders/InjectionFinder', function () {
	describe('#find', function () {
		it('should find all dependency injections in source', function (done) {
			// test
		});
	});
});
``` 

## Docs
Write clean and simple docs in the `docs/index.md` file.

## Submit a PR
* PR should be submitted from a separate branch (use `git checkout -b "fix-123"`) to a `develop` branch
* PR should not decrease the code coverage more than by 1%
* PR's commit message should use present tense and be capitalized properly (i.e., `Fix #123: Add tests for RequestRouter`)

Still have any questions? Join the [Gitter](https://gitter.im/catberry/catberry) and ask them there.