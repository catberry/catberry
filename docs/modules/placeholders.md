#Placeholders

Placeholder is a block of page that is controlled by a module. In fact every
placeholder is a template that is stored in module's `placeholders` directory 
and rendered in any position on page.

Catberry uses [dustjs](https://github.com/linkedin/dustjs) template engine.
All stuff about how to use and what syntax it has you can read [here]
(https://github.com/linkedin/dustjs/wiki/Dust-Tutorial). Also [dustjs-helpers]
(https://github.com/linkedin/dustjs-helpers) are included in Catberry.

Placeholder is named by its filename, for example, if file is called `some.dust`
then placeholder name is `some`. But in some cases, for example using 
[Template Provider](../services/userland/template-provider.md) you will need 
a full name. It means if you have module `cat` and its placeholder `paw` then 
full name of placeholder will be `cat_paw`.
 
Please keep in mind that placeholder name should satisfy regular expression
`^[\w-]+$`.

##How do I decide what part of page should be a placeholder?
There are two simple rules that helps with this decision:

* If you can prepare whole data context for some part of page using one request 
to API service that means this part of page could be a placeholder
* If you want to refresh some group of placeholders simultaneously using 
shared parameters from URL then you should group these placeholders into 
one module

For example, you have some parts of page that dependents on current ID of 
product in URL. There is a part of page that displays product details, 
another one displays comments of users about this product and some side block 
that shows "similar product". All these three parts of page are placeholders.
And as well it all depends on one shared parameter `productId`. It means that
placeholders should be grouped into one module `product`.

##Placeholder types
There are two reserved names of placeholders:

* `__index` - is used as whole page template in `main` module and 
is called "root placeholder"
* `__error` - is used to show user-friendly error messages in blocks that has 
errors during rendering. It is called "error placeholder"

##Placeholder references
All placeholders can have references to other placeholders and when rendering
engine starts to render some placeholder and meet such reference it render
referenced placeholder and recursively repeat this process. 
But every placeholder can be rendered only once, second time it will just be
skipped.

The reference itself is any HTML element with ID equals full name 
of placeholder. For example you have two modules: `cat` and `planet`. 
`planet` has placeholder `house` and `cat` has placeholder `black-cat`.

Also you always must have `main` module with placeholder `__index`.
So, let's say you have such `__index`:

```html
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title>Cat planet</title>
</head>
<body>
	<div id="planet_house"></div>
</body>
</html>
```

And placeholder `house` of `planet` is:
```html
Big house here... Wait... It's a cat!
<div id="cat_black-cat"></div>
```

Also `cat` module has such `black-cat` placeholder:
```html
<h1>Meow, my planet friends</h1>!
```

As a result of rendering will be:

```html
<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title>Cat planet</title>
</head>
<body>
	<div id="planet_house">
		Big house here... Wait... It's a cat!
		<div id="cat_black-cat">
			<h1>Meow, my planet friends</h1>!
		</div>
	</div>
</body>
</html>
```

All placeholder references just were replaced with rendered templates with data
from modules.

In some situations you need to render some part of HTML that often repeats
in your markup but do not have some complex logic for creation of data context.
In this case it is really handy to use [dustjs partials]
(https://github.com/linkedin/dustjs/wiki/Dust-Tutorial#partials) 
not placeholders.
 
##Streaming
At server whole page is rendered using stream. In many frameworks (like express)
rendering is happened in-memory and after whole page is prepared 
it is sent to browser.

Catberry works different. When rendering process is just started it already 
starts to send data to browser and user already sees a page. 
For user this experience looks like very fast and smooth rendering process and 
the initial delay for response is minimal.

When you make request to your API service for every placeholder on page it can
be slowly for rendering whole page, but using streams it looks like "blazing
fast", because user already sees page before any request to API service and each 
placeholder is rendered in browser immediately after response from your API 
service.

That is why Catberry has so fast rendering engine.

##Concurrent rendering
In browser rendering works differently. Rendering engine observes state of
every module and if it is changed all placeholders of changed modules are 
rendering again. During rendering in browser all API requests are doing 
concurrently for all placeholder references that makes rendering process fast.

##Scroll top
By default Catberry tries to save current scroll position when rendering 
in browser but in some situation you may need to scroll top of page when change
content of page. In this case you can add `data-scroll-top` attribute to your
placeholder HTML element. After such placeholder was rendered page will be 
scrolled top.

##HEAD element as a placeholder
`<head>` element also can be a placeholder. You can change `<title>`, `<meta>`,
add new `<script>` or `<link>` elements dynamically. At server `<head>` 
placeholder is rendered as usually, but in browser `<head>` rendering is 
not simple. When your module change content of `<head>` placeholder, rendering 
engine merges all changes with current `<head>` and do not load styles and 
scripts more times.

So, what is happened during this merge:

* Catberry compares current and new `<head>` representation
* If current `<head>` has elements that are absent in new `<head>` then all 
these elements are removed from `<head>` except scripts and styles
* Then Catberry takes elements from new `<head>` that are absent in current 
`<head>` and adds it to end of current `<head>`

This approach makes `<head>` changes smoothly for user and do not execute 
JavaScript code, included in head, twice.

Read next:

* [Render Method](render-method.md)

Read also:

* [Handle Method](handle-method.md)
* [Submit Method](submit-method.md)
* [Context](context.md)
