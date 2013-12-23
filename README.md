#### meddleware
Configuration-based middleware registration for express.

##### Usage
```javascript
var http = require('http'),
    express = require('express'),
    meddleware = require('meddleware'),
    config = require('shush')('./config/middleware');

var app = express();
app.use(meddleware(config));
http.listen(app);

```


##### Configuration
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

##### Options
- `enabled` (*boolean*) - Set to `true` to enable middleware, `false` to disable. This option also supports enabling and disabling middleware at runtime.

- `priority` (*number*) - The weight to give a particular piece of middleware when sorting for registration. Lower numbers
are registered first, while higher numbers are registered later. If `priority` is not a number, this setting defaults
to `Number.MIN_VALUE`.

- `module` (*string*) - The module to load containing the middleware implementation. Can be an installed module or a path to a module file within your project/application.

- `factoryMethod` (*string*, optional) - The method on the provided module upon which invocation will create the middleware function to register. If a factory method is not provided, it defaults to the name of the current middleware being processed, and finally back to the module itself.

- `arguments` (*array*, optional) - An array of arguments to pass to the middleware factory.

##### express App Events
Along with registration