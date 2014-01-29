#### meddleware
Configuration-based middleware registration for express.

[![Build Status](https://travis-ci.org/paypal/meddleware.png)](https://travis-ci.org/paypal/meddleware)

#### Usage
```javascript
var http = require('http'),
    express = require('express'),
    meddleware = require('meddleware'),
    config = require('shush')('./config/middleware');

var app = express();
app.use(meddleware(config));
http.createServer(app).listen(8080);

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
    },

    "misc": {
        "priority": 50,
        "parallel": {
            "user": {
                "enabled": true,
                "module": "express",
                "arguments": []
            },
        }
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

- `parallel` (*object*, optional) - A meddleware configuration object containing middleware which should be executed in parallel, proceeding only when all have completed.

- `race` (*object*, optional) - A meddleware configuration object containing middleware which should be executed in parallel, but will proceed when the first one completes.

- `fallback` (*object*, optional) - A meddleware configuration object containing middleware which should be executed sequentially, proceeding upon first successfully resolved middleware, falling back in the event of a failure.


#### Express App Events
Along with registration, consumers can be notified of registration events. **NOTE: These events are *only* triggered for
the middleware that is registered via `meddleware`.** All middleware events receive the following eventargs object:
```javascript
{
   app: [object Object], // express app
   config: [object Object] // config object for the current middleware
}
```
There are 4 types of events one can subscribe to:

- `middleware:before` - Subscribe to this event to be notified immediately before every middleware registration. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `config` being the configuration object used in registering the middleware.


- `middleware:before:{name}` - Subscribe to this event to be notified immediately before registration of the named middleware. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `config` being the configuration object used in registering the middleware.


- `middleware:after` - Subscribe to this event to be notified immediately after every middleware registration. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `config` being the configuration object used in registering the middleware.


- `middleware:after:{name}` - Subscribe to this event to be notified immediately after registration of the named middleware. The event handler
will receive an eventargs object containing 2 properties: `app` being the express application against which the middleware
was registered, and `config` being the configuration object used in registering the middleware.

```javascript
var express = require('express'),
    meddle = require('meddleware'),
    config = require('shush')('./config/middleware');

app = express();

app.on('middleware:before', function (eventargs) {
    console.log(eventargs.config.name); // depends on which middleware is about to be registered
});

app.on('middleware:before:session', function (eventargs) {
    console.log(eventargs.config.name); // 'session'
});

app.on('middleware:after:session', function (eventargs) {
    console.log(eventargs.config.name); // session
});

app.on('middleware:after', function (eventargs) {
    console.log(eventargs.config.name); // depends on which middleware is about to be registered
});

app.use(meddle(config));
```

#### Middleware Flow Control
To manage groups of middleware, there is support for `parallel`, `race`, and `fallback`, which allow you to register
middleware intended to be run using each type of flow control. Additionally, these registration types are composable.

##### Parallel
Middleware designated as `parallel` will all be executed simultaneously, continuing processing of the remaining middleware stack only when all have completed.
```json
{
     "cookieParser": {
         "enabled": false,
         "priority": 10,
         "module": "express",
         "arguments": [ "keyboard cat" ]
     },

    "setup": {
        "enabled": true,
        "priority": 20,
        "parallel": {
            "service1": {
                "enabled": true,
                "module": "path:./lib/middleware/services"
            },
            "service2": {
                "enabled": true,
                "module": "path:./lib/middleware/services"
            },
            "service3": {
                "enabled": true,
                "module": "path:./lib/middleware/services"
            }
        }
    },

    "json": {
        "enabled": true,
        "priority": 30,
        "module": "express",
    }
```

##### Race
Middleware designated as `race` will all be executed simultaneously, continuing processing of the remaining middleware stack when the *first* has completed.
```json
{
     "cookieParser": {
         "enabled": false,
         "priority": 10,
         "module": "express",
         "arguments": [ "keyboard cat" ]
     },

    "setup": {
        "enabled": true,
        "priority": 20,
        "race": {
            "service1a": {
                "enabled": true,
                "module": "path:./lib/middleware/services"
            },
            "service1b": {
                "enabled": true,
                "module": "path:./lib/middleware/services"
            }
        }
    },

    "json": {
        "enabled": true,
        "priority": 30,
        "module": "express",
    }
```

##### Fallback
Middleware designated as `fallback` will execute each middleware in series until one completes successfully.
```json
{
     "cookieParser": {
         "enabled": false,
         "priority": 10,
         "module": "express",
         "arguments": [ "keyboard cat" ]
     },

    "setup": {
        "enabled": true,
        "priority": 20,
        "fallback": {
            "primaryService": {
                "enabled": true,
                "priority": 10,
                "module": "path:./lib/middleware/services"
            },
            "secondaryService": {
                "enabled": true,
                "priority": 20,
                "module": "path:./lib/middleware/services"
            }
        }
    },

    "json": {
        "enabled": true,
        "priority": 30,
        "module": "express",
    }
```

#### Tests
```bash
$ npm test
```

#### Coverage
````bash
$ npm run-script cover && open coverage/lcov-report/index.html
```