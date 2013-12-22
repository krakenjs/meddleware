##### meddleware
Middleware configuration support for express.

```javascript
var http = require('http'),
    express = require('express'),
    meddleware = require('meddleware');

var app = express();
app.use(meddleware(config));
http.listen(app);

```