#Catberry framework code style guide

There are some aspects of our code style below:

 * We use tabs
 * We use only strict mode
 * We use only single quotes
 * We use jsDoc for all functions
 * We strongly use **camelCase for variables**, **PascalCase for constructors** and **UPPER_CASE with underscores for constants**
```javascript
var SOME_CONSTANT = 42;

function Constructor() {
    var someVariable = 'someValue';
}
```
 * We always use braces where it's possible, first brace on same line and space before it

Right
```javascript
if(condition) {

}
```
Wrong
```javascript
if(condition)
{
}
if(condition2){
}
```
 * We use multiple declaration where it's possible

Right
```javascript
var a, b, c, d;
```
Wrong
```javascript
var a;
var b;
var c;
var d;
```
 * We don't use constructor functions for side-effects

Right
```javascript
var variable = new Constructor();
```
Wrong
```javascript
new Constructor();
```
 * We use explicit type conversion by Number, Boolean and String functions

Right
```javascript
x = Boolean(y);
x = Number(y);
x = String(y);
x = s.indexOf('.') !== -1;
```
Wrong
```javascript
x = !!y;
x = +y;
x = '' + y;
x = ~s.indexOf('.');
```
 * We don't need trailing whitespaces
 * We don't use 'with' operator
 * We don't use multiple line breaks
 * Maximum length of line  - 85
 * Maximum arguments in function - 5
 * Maximum code block depth - 3
 * Maximum statement count per function - 50
 * Maximum [cyclomatic complexity](http://en.wikipedia.org/wiki/Cyclomatic_complexity) - 10

Before every commit please use "npm test" command to check code style.