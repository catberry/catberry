#Submit method
Every module should have `submit` method like this:
```javascript
Module.prototype.submit = function (formName, formObject, callback) {
	callback(null, function () {
		// some actions after all modules have handled event
	}); 
};
```

This method is used to receive submitted forms from page. Every click on submit
button checks if form has required attributes and route serialized form to 
module-receiver.

The main thing you should keep in mind is that method `submit` is executing only
in browser. It means you can not use server environment-specified
JavaScript, `process` object for example.

Typical form using this method looks like this:
```html
<form name="paw-size" data-module="cat" data-dependents="cat_paw&cat_body">
    Enter paw size for cat:<br/>
    <input name="size" type="text"><br/>
    <input type="submit" value="Let's see the paw!">
</form>
```
Required attributes to send this form to module are following:

* `name` - form should have a name
* `data-module` - name of module receiver

Also you can specify full names of placeholders that should be refreshed after
form will be submitted to module. Use `data-dependents` attribute for that and
enumerate placeholder full names with `&` separator.

If you click on `submit` input in example above then method `submit` of module
`cat` will be called with `formName = 'paw-size'`, `formObject` like this:
```javascript
{
	size: 'some entered paw size value'
}
```
After module `cat` invokes `callback` placeholders `cat_paw` and `cat_body` will
be refreshed and `then` function will be called after that. 

If you do not want to code ugly `switch` statements for form name 
to determine what logic module should use to submit data, you can use
[catberry-module](https://www.npmjs.org/package/catberry-module) with smart 
method calling to avoid that.

Read also:

* [Placeholders](placeholders.md)
* [Render Method](render-method.md)
* [Handle Method](handle-method.md)
* [Context](context.md)