#### meddleware
Configuration-based middleware registration for express.

#### Usage
```javascript
var http = require('http'),
    express = require('express'),
    meddleware = require('meddleware'),
    config = require('shush')('./config/middleware');

var app = express();
app.use(meddleware(config));
http.listen(app);

```


#### Configuration
`meddleware` configuration consists of an object containing properties for each of the middleware to be registered.
```json
{
    "favicon": {
        "enabled": true,
        "priority": 10,
        "module": "express"
    },

    "static": {
        "enabled": true,
        "priority": 20,
        "module": "express",
        "arguments": [ "public" ]
    },

    "custom": {
        "enabled": true,
        "priority": 30,
        "route": "/foo",
        "module": "./lib/middleware",
        "factoryMethod": "customMiddleware",
        "arguments": [ "foo", { "bar": "baz" } ]
    },

    "cookieParser": {
        "enabled": false,
        "priority": 40,
        "module": "express",
        "arguments": [ "keyboard cat" ]
    }
}

```

#### Options
- `enabled` (*boolean*) - Set to `true` to enable middleware, `false` to disable. This option also supports enabling and disabling middleware at runtime.

- `priority` (*number*) - The weight to give a particular piece of middleware when sorting for registration. Lower numbers
are registered first, while higher numbers are registered later. If `priority` is not a number, this setting defaults
to `Number.MIN_VALUE`.

- `module` (*string*) - The module to load containing the middleware implementation. Can be an installed module or a path to a module file within your project/application.

- `factoryMethod` (*string*, optional) - The method on the provided module upon which invocation will create the middleware function to register. If a factory method is not provided, it defaults to the name of the current middleware being processed, and finally back to the module itself.

- `arguments` (*array*, optional) - An array of arguments to pass to the middleware factory.

- `route` (*string*, optional) - An express route against which the middleware should be registered.


#### Express App Events
Along with registration, consumers can be notified of registration events. **NOTE: These events are *only* triggered for
the middleware that is registered via `meddleware`.** All middleware event receive the following eventargs object:
```javascript
{
   app: [object Object], // express app
   config: [object Object] // config object for the current middleware
}
```
There are 4 types of events one can subscribe to:

- `middleware:before` - Subscribe to this event to be notified immediately before every middleware registration. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `spec` being the configuration object used in registering the middleware.


- `middleware:before:{name}` - Subscribe to this event to be notified immediately before registration of the named middleware. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `spec` being the configuration object used in registering the middleware.


- `middleware:after` - Subscribe to this event to be notified immediately after every middleware registration. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `spec` being the configuration object used in registering the middleware.


- `middleware:after:{name}` - Subscribe to this event to be notified immediately after registration of the named middleware. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `spec` being the configuration object used in registering the middleware.

```javascript
var express = require('express'),
    meddle = require('meddleware'),
    config = require('shush')('./config/middleware');

app = express();

app.on('middleware:before', function (eventargs) {
    console.log(eventargs.spec.name); // depends on which middleware is about to be registered
});

app.on('middleware:before:session', function (eventargs) {
    console.log(eventargs.spec.name); // 'session'
});

app.on('middleware:after:session', function (eventargs) {
    console.log(eventargs.spec.name); // session
});

app.on('middleware:after', function (eventargs) {
    console.log(eventargs.spec.name); // depends on which middleware is about to be registered
});

app.use(meddle(config));
```


#### Tests
```bash
$ npm test
```

#### Coverage
````bash
$ npm run-script cover && open coverage/lcov-report/index.html
```