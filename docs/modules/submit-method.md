#Submit method
Every module can have `submit` method like this:
```javascript
Module.prototype.submit = function (formName, event) {
	return Promise.resolve(); // promise or nothing 
};
```

Or like this:
```javascript
Module.prototype.submitFormName = function (event) {
	return Promise.resolve(); // promise or nothing 
};
```

This method is used to process submitted forms from page. Every form submit 
routes serialized form to module-receiver.

For example you have such form:
```html
<form name="paw-size" data-module="cat" data-dependents="cat_paw&cat_body">
    Enter paw size for cat:<br/>
    <input name="size" type="text"><br/>
    <input type="submit" value="Let's see the paw!">
</form>
```

You enter a paw size and click submit and Catberry tries to invoke such 
methods by priorities:

* `Cat.submitPawSize(event)`
* `Cat.submit('paw-size', event)`
* `function() { return Promise.resolve(); }`

As you may notice Catberry converts name of event to camel case and 
build name or `submit` method automatically.

The main thing you should keep in mind is that method `submit` is executing only
in browser. It means you can not use server environment-specified
JavaScript, `process` object for example.

Required attributes for form element to send this form to module are following:

* `name` - form should have a name
* `data-module` - name of module receiver

Also you can specify full names of placeholders that should be refreshed after
form will be submitted to module. Use `data-dependents` attribute for that and
enumerate placeholder full names with `&` separator.

##Event object
For previous example `event` argument in submit method will be object like this:
```javascript
{
	element: $(), // form element wrapped by jQuery 
	name: 'paw-size', // the same as name attribute value in form element
	moduleName: 'cat', // the same as data-module attribute value
	values: { // all values from form inputs
		size: 'some text was typed in size field'
	}
}
```

Read next:

* [Context](context.md)

Read also:

* [Placeholders](placeholders.md)
* [Render Method](render-method.md)
* [Handle Method](handle-method.md)