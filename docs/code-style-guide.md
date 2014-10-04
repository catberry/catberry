#Catberry Code Style Guide

There are some aspects of Catberry code style below:

##Table Of Contents
1. [Formatting](#formatting)
1. [JavaScript](#javascript)
1. [Naming](#naming)
1. [Variables](#variables)
1. [Objects](#objects)
1. [Arrays](#arrays)
1. [Types](#types)
1. [Functions](#functinos)
1. [Strings](#strings)
1. [Blocks](#blocks)
1. [Comments](#comments)
1. [Code Quality Tools](#code-quality-tools)

##Formatting

- Always use tabs (hard tabs)
- Never leave trailing whitespaces
- Never use multiple line breaks
- Maximum length of line &mdash; 80
- Always use semicolons
- Always use space after keywords and before curly braces except `else` and `catch`

	```javascript
	// bad
	if(some){
	
	} else {
		
	}
	
	// good
	if (some) {
	
	}else{
	
	}
	```
	
- Set off operators with spaces.

	```javascript
	// bad
	var x=y+5;
	
	// good
	var x = y + 5;
	```
- Use indentation when making long method chains.

	```javascript
	// bad
	$('#items').find('.selected').highlight().end().find('.open').updateCount();
	
	// good
	$('#items')
		.find('.selected')
		.highlight()
		.end()
		.find('.open')
		.updateCount();
	```

- Never use leading commas

	```javascript
	// bad
	var once
		, upon
		, aTime;
	
	// good
	var once,
		upon,
		aTime;
	```
	
- Always use curly braces where it's possible, first brace on same line and 
 space before it

	```javascript
	// bad
	if (condition)
	{
	}
	if(condition2){
	}
	
	// good
	if (condition) {
	
	}
	```

**[⬆ back to top](#table-of-contents)**

##JavaScript

- Use ECMAScript 5.1 syntax ([ECMA-262](http://www.ecma-international.org/ecma-262/5.1/))
- Always use [JavaScript Strict Mode](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode) 
in the beginning of each .js file. 
- Never use [with](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/with), 
[let](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let) or 
[void](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/void) operator
- Maximum arguments in function &mdash; 5
- Maximum code block depth &mdash; 3
- Maximum statement count per function &mdash; 50
- Maximum [cyclomatic complexity](http://en.wikipedia.org/wiki/Cyclomatic_complexity) - 10

**[⬆ back to top](#table-of-contents)**

##Naming

- Always use `camelCase` for variables, `PascalCase` for constructors 
and `UPPER_CASE` with underscores for constants

	```javascript
	var SOME_CONSTANT = 42;
	
	function Constructor() {
		var someVariable = 'someValue';
	}
	```
	
- Avoid single letter names. Be descriptive with your naming.

	```javascript
	// bad
	function q() {
		// ...stuff...
	}
	
	// good
	function query() {
		// ..stuff..
	}
	```
	
- Use a leading underscore `_` when naming private properties

	```javascript
	// bad
	this.__firstName__ = 'Panda';
	this.firstName_ = 'Panda';
	
	// good
	this._firstName = 'Panda';
	```
	
- When saving a reference to `this` use name `self`.

	```javascript
	// bad
    	function() {
    		var _this = this;
    		return function() {
    			console.log(_this);
    		};
    	}
	// good
	function() {
		var self = this;
		return function() {
			console.log(self);
		};
	}
	```

- If variable is boolean type then start its name with `is` or `has` prefix

	```javascript
	// bad
	var success = true;
	
	// good
	var isSuccess = true;
	```

- If JavaScript file has definition of constructor it should has name of this
constructor in PascalCase like `Constructor.js`

**[⬆ back to top](#table-of-contents)**

##Variables

- Always use `var` to declare variables. Not doing so will result in global 
variables. We want to avoid polluting the global namespace.

	```javascript
	// bad
	superPower = new SuperPower();
	
	// good
	var superPower = new SuperPower();
	```
	
- Use one `var` declaration for multiple variables and declare each variable 
on a newline.
	
	```javascript
	// bad
	var items = getItems();
	var goSportsTeam = true;
	var dragonBall = 'z';
	
	// good
	var items = getItems(),
		goSportsTeam = true,
		dragonBall = 'z';
	```

- Declare unassigned variables last. This is helpful when later on you might 
need to assign a variable depending on one of the previous assigned variables.

	```javascript
	// bad
	var i, len, dragonBall,
		items = getItems(),
		goSportsTeam = true;
	
	// bad
	var i, items = getItems(),
		dragonBall,
		goSportsTeam = true,
		len;
	
	// good
	var items = getItems(),
		goSportsTeam = true,
		dragonBall,
		length,
		i;
	```

- Assign variables at the top of their scope. This helps avoid issues with 
variable declaration and assignment hoisting related issues.

	```javascript
	// bad
	function () {
		test();
		console.log('doing stuff..');
	
		//..other stuff..
	
		var name = getName();
	
		if (name === 'test') {
			return false;
		}
	
		return name;
	}
	
	// good
	function () {
		var name = getName();
	
		test();
		console.log('doing stuff..');
	
		//..other stuff..
	
		if (name === 'test') {
			return false;
		}
		
		return name;
	}
	
	// bad
	function () {
		var name = getName();
		
		if (!arguments.length) {
			return false;
		}
		
		return true;
	}
	
	// good
	function () {
		if (!arguments.length) {
			return false;
		}
		
		var name = getName();
		
		return true;
	}
	```

**[⬆ back to top](#table-of-contents)**

##Objects

- Always use the literal syntax for object creation.

	```javascript
	// bad
	var item = new Object();
	
	// good
	var item = {};
	```

- When possible do not use [delete](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete) 
operator. In some cases it can cause [performance degradation](https://speakerdeck.com/addyosmani/javascript-memory-management-masterclass).

- Use dot notation when accessing properties.

	```javascript
	var luke = {
		jedi: true,
		age: 28
	};
	
	// bad
	var isJedi = luke['jedi'];
	
	// good
	var isJedi = luke.jedi;
	```

- Use subscript notation `[]` when accessing properties with a variable.

	```javascript
	var luke = {
		jedi: true,
		age: 28
	};
	
	function getProp(prop) {
		return luke[prop];
	}
	
	var isJedi = getProp('jedi');
	```
	
**[⬆ back to top](#table-of-contents)**

##Arrays

- Always use the literal syntax for array creation.

	```javascript
	// bad
	var array = new Array();
	
	// good
	var array = [];
	```

- Edit array items only using:
 - [push](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push)
 - [pop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/pop)
 - [shift](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/shift)
 - [unshift](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/unshift)
 - [slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice)
 - [splice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice)

	```javascript
	var array = [1, 2, 3]; 
	
	// bad
	array[array.length] = 'some';
	
	// good
	array.push('some');
	```

- Use functional approach when working with arrays. Use methods like:
 - [every](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every)
 - [filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)
 - [indexOf](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf)
 - [forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach)
 - [map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map)
 - [reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce)
 - [reduceRight](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/ReduceRight)
 - [reverse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse)
 - [some](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some)
 - [sort](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort)

	```javascript
	var array = [1, 2, 3, 4, 5];
	
	// bad
	var hasGreaterThanThree = false;
	for (var i = 0; i < array.length; i++) {
		if (array[i] > 3) {
			hasGreaterThanThree = true;
			break;
		}
	}
	
	// good
	var hasGreaterThanThree = array.some(function (item) {
		return item > 3;
	});
	```

- To convert an array-like object to an array, use [slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice) like this

	```javascript
	var args = Array.prototype.slice.call(arguments);
	```

- When you need to copy an array use [slice](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice) like this

	```javascript
	var items = [1, 2, 3, 4, 5],
		itemsCopy = items.slice();
	```

**[⬆ back to top](#table-of-contents)**

##Types

- Always use explicit type conversion with `Number`, `Boolean` and 
`String` (`.toString()`) functions

	```javascript
	// bad
	var boolean = !!some,
		number = +some,
		string = '' + some,
		hasDot = ~string.indexOf('.');
	
	// good
	var boolean = Boolean(some),
		number = Number(some),
		string = String(some),
		string = some.toString(),
		hasDot = string.indexOf('.') !== -1;
	```

- Use only [===](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comparison_Operators#Identity_.2F_strict_equality_(.3D.3D.3D))([!==](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Comparison_Operators#Non-identity_.2F_strict_not_equal_(!.3D.3D))) operator

**[⬆ back to top](#table-of-contents)**

##Functions

- Function expressions:

	```javascript
	// anonymous function expression
	var anonymous = function () {
		return true;
	};

	// named function expression
	var named = function named() {
		return true;
	};

	// immediately-invoked function expression (IIFE)
	(function () {
		console.log('Welcome to the Internet. Please follow me.');
	})();
	```

- Never declare a function in a non-function block (if, while, etc). 
Assign the function to a variable instead. Browsers will allow you to do it, 
but they all interpret it differently.

	**Note:** ECMA-262 defines a `block` as a list of statements. 
	A function declaration is not a statement. [Read ECMA-262's note on this issue](http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf#page=97).

	```javascript
	// bad
	if (currentUser) {
		function test() {
			console.log('Nope.');
		}
	}
	
	// good
	var test;
	if (currentUser) {
		test = function test() {
			console.log('Yup.');
		};
	}
	```

- Never name a parameter `arguments`, this will take precedence over 
the `arguments` object that is given to every function scope.

	```javascript
	// bad
	function nope(name, options, arguments) {
		// ...stuff...
	}
	
	// good
	function yup(name, options, args) {
		// ...stuff...
	}
	```

- Never use constructor functions for side-effects

	```javascript
	// bad
	 new Constructor();
	
	// good
	var variable = new Constructor();
	```

- Always chain function calls when possible

	```javascript
	// bad
	var mapped = array.map(mapper),
		filtered = mapped.filter(filter);
	
	filtered.forEach(handler);
	
	// good
	array
		.map(mapper)
		.filter(filter)
		.forEach(handler);
	```

- Separate function arguments with space after coma

	```javascript
	// bad
	function some(first,second,third) {
	
	}
	
	// good
	function some(first, second, third) {
	
	}
	```

- Use constructor and prototype to define module when you need to store 
local state like this:

	```javascript
	
	'use strict';
	
	var MILE_MULTIPLIER = 0.6214;
	
	/**
	 * Creates new instance of distance descriptor.
	 * @constructor
	 */
	function DistanceDescriptor() {
		// here could be some initialization
	}
	
	DistanceDescriptor.prototype._distance = 0;
	
	/**
	 * Sets distance in miles.
	 * @param {Number} distance Distance in miles.
	 */
	DistanceDescriptor.prototype.setDistanceInMiles = function (distance) {
		this._distance = distance / MILE_MULTIPLIER;
	};
	
	/**
	 * Sets distance in kilometers.
	 * @param {Number} distance Distance in kilometers.
	 */
	DistanceDescriptor.prototype.setDistanceInKilometers = function (distance) {
		this._distance = distance;
	};
	
	/**
	 * Gets distance in miles.
	 */
	DistanceDescriptor.prototype.getDistanceInMiles = function () {
		return this._distance * MILE_MULTIPLIER;
	};
	
	/**
	 * Gets distance in kilometers.
	 */
	DistanceDescriptor.prototype.getDistanceInKilometers = function () {
		return this._distance;
	};
	
	```

- Use [bind](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind) 
for [partial application](http://en.wikipedia.org/wiki/Partial_application) 
or to specify `this` inside the method.

**[⬆ back to top](#table-of-contents)**

##Strings

- Use only single quotes for strings

	```javascript
	// bad
	var string = "very bad string";
	
	// good
	var string = 'this is a good one';
	```
	
- Strings longer than 80 characters should be written across multiple lines 
using string concatenation like this:

	```javascript
	// bad
	var errorMessage = 'This is a super long error that was thrown because of Batman. When you stop to think about how Batman had anything to do with this, you would get nowhere fast.';
	
	// bad
	var errorMessage = 'This is a super long error that was thrown because \
		of Batman. When you stop to think about how Batman had anything to do \
		with this, you would get nowhere \
		fast.';
	
	// good
	var errorMessage = 'This is a super long error that was thrown because ' +
		'of Batman. When you stop to think about how Batman had anything to do ' +
		'with this, you would get nowhere fast.';
	```

**[⬆ back to top](#table-of-contents)**

##Comments

- Always use [jsDoc](http://usejsdoc.org/) for everything
- Use one line comments `//` instead `/* ... */`

	```javascript
	// bad
	
	/*
	 Some 
	 multiline 
	 comment
	*/
	
	// good
	
	// Some
	// multiline
	// comment
	```
	
- Use `// TODO:` to annotate solutions or problems

	```javascript
	function Calculator() {
		// TODO: total should be configurable by an options param
		this.total = 0;

		return this;
	}
	```

**[⬆ back to top](#table-of-contents)**

##Code Quality Tools

Code style should be checked by:

- [jscs](https://www.npmjs.org/package/jscs) with 
this [.jscsrc](https://github.com/catberry/catberry/blob/master/.jscsrc) file
- [jshint](https://www.npmjs.org/package/jshint) with this 
[.jshintrc](https://github.com/catberry/catberry/blob/master/.jshintrc) file

These tools should be called before tests by command `npm test`.

**[⬆ back to top](#table-of-contents)**