#Catberry Services

In Catberry all framework components such as Logger or 
Universal HTTP(S) Request are called services. 

Whole Catberry architecture is built using [Service Locator]
(http://en.wikipedia.org/wiki/Service_locator_pattern) pattern and 
[Dependency Injection](http://en.wikipedia.org/wiki/Dependency_injection).
Service locator is a Catberry core component that knows every other Catberry 
component and all these components can ask Service Locator to get instance
of some other component. For example every component and even userland 
catberry module can ask for a Logger to log messages to console.

When Catberry initializes itself it fills Service Locator with own set of
components but framework users can also register own components and even
replace implementation of some Catberry components. For example you can replace
Logger service in Locator with own Logger which sends messages to Graylog, for
example.
 
To register own components you should remember that for server and browser you
probably need different implementations of you component.

Learn more how to use Service Locator in next section.

Read next:

* [Service Locator](services/service-locator.md)
