#Routing

Catberry has two routing subsystems:

* URL routing system: routes all URL changes and map URL arguments 
to states of modules. All rules must be defined in `/routes.js`
* Event routing system: routes all hash changes and `data-event` link clicks. 
Invokes handle methods of all modules-receivers. All rules must be defined 
in `/events.js`

If your application does not have routing rules your modules can not render
page blocks and handle any events from page.

All details about definition of route rules are described in next sections.

Read next:
 
 * [URL Route Definition](url-route-definition.md)
 * [Event Route Definition](event-route-definition.md)