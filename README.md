#### meddleware
Configuration-based middleware registration for express.

Note: `meddleware >=1.0` is only compatible with `express >=4.0`. For `express 3.x` support, please use `meddleware 0.1.x`.

[![Build Status](https://travis-ci.org/krakenjs/meddleware.png)](https://travis-ci.org/krakenjs/meddleware)

#### Usage
```javascript
var http = require('http'),
    express = require('express'),
    meddleware = require('meddleware'),
    config = require('shush')('./config/middleware');

var app = express();
app.use(meddleware(config)); // or app.use('/foo', meddleware(config));
http.createServer(app).listen(8080);

```


#### Configuration
`meddleware` configuration consists of an object containing properties for each of the middleware to be registered.
```json
{
    "favicon": {
        "enabled": true,
        "priority": 10,
        "module": "static-favicon"
    },

    "static": {
        "enabled": true,
        "priority": 20,
        "module": {
            "name": "serve-static",
            "arguments": [ "public" ]
        }
    },

    "custom": {
        "enabled": true,
        "priority": 30,
        "route": "/foo",
        "module": {
            "name": "./lib/middleware",
            "method": "customMiddleware",
            "arguments": [ "foo", { "bar": "baz" } ]
        }
    },

    "cookieParser": {
        "enabled": false,
        "priority": 40,
        "module": {
            "name": "cookie-parser",
            "arguments": [ "keyboard cat" ]
        }
    },

    "misc": {
        "priority": 50,
        "parallel": {
            "user": {
                "enabled": true,
                "module": {
                    "name": "the-module",
                    "arguments": []
                }
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

- `module` (*object*, *string*) - The name or definition of the module to load containing the middleware implementation. Can be an installed module or a path to a module file within your project/application.

    - `name` (*string*) - The name of the module or path to local module.

    - `method` (*string*, optional) - The method on the provided module upon which invocation will create the middleware function to register. If a factory method is not provided, it defaults to the name of the current middleware being processed, and finally back to the module itself.

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
         "module": {
            "name": "cookie-parser",
            "arguments": [ "keyboard cat" ]
        }
     },

    "setup": {
        "enabled": true,
        "priority": 20,
        "parallel": {
            "service1": {
                "enabled": true,
                "module": "path:./lib/middleware/service1"
            },
            "service2": {
                "enabled": true,
                "module": "path:./lib/middleware/service2"
            },
            "service3": {
                "enabled": true,
                "module": "path:./lib/middleware/service3"
            }
        }
    },

    "json": {
        "enabled": true,
        "priority": 30,
        "module": {
            "name": "body-parser",
            "method": "json"
        }
    }
```

##### Race
Middleware designated as `race` will all be executed simultaneously, continuing processing of the remaining middleware stack when the *first* has completed.
```json
{
     "cookieParser": {
         "enabled": false,
         "priority": 10,
         "module": {
            "name": "cookie-parser",
            "arguments": [ "keyboard cat" ]
         }
     },

    "setup": {
        "enabled": true,
        "priority": 20,
        "race": {
            "service1a": {
                "enabled": true,
                "module": "path:./lib/middleware/service1a"
            },
            "service1b": {
                "enabled": true,
                "module": "path:./lib/middleware/service1b"
            }
        }
    },

    "json": {
        "enabled": true,
        "priority": 30,
        "module": {
            "name": "body-parser",
            "method": "json"
        }
    }
```

##### Fallback
Middleware designated as `fallback` will execute each middleware in series until one completes successfully.
```json
{
     "cookieParser": {
         "enabled": false,
         "priority": 10,
         "module": {
             "name": "cookie-parser",
             "arguments": [ "keyboard cat" ]
         }
     },

    "setup": {
        "enabled": true,
        "priority": 20,
        "fallback": {
            "primaryService": {
                "enabled": true,
                "priority": 10,
                "module": "path:./lib/middleware/primaryService"
            },
            "secondaryService": {
                "enabled": true,
                "priority": 20,
                "module": "path:./lib/middleware/secondaryService"
            }
        }
    },

    "json": {
        "enabled": true,
        "priority": 30,
        "module": {
            "name": "body-parser",
            "method": "json"
        }
    }
```

#### Tests
```bash
$ npm test
```

#### Coverage
````bash
$ npm run cover && open coverage/lcov-report/index.html
```