express-minify
==============

express-minify is an express middleware that automatically minify and cache your javascript and css files. It also supports LESS/SASS/Stylus/CoffeeScript dynamic processing and minifying.

Please be free to contribute to this project :)

# Note

For better performance and more powerful features (eg: generate Javascript Maps), you should use [Grunt](http://gruntjs.com/) (The Javascript Task Runner)
to complete these tasks such as minifying and CoffeeScript/Stylus/LESS compiling.

This module should ONLY be used for DEBUG propose.

# Installation

```
npm install express-minify
```

# Usage

```javascript
var minify = require('express-minify');
app.use(minify());
```

## Options

```javascript
app.use(minify(options));
```

- `js_match`: the regular expression that matches javascript content-type.

  **Default**: `/javascript/`
  
- `css_match`: the regular expression that matches css content-type.

  **Default**: `/css/`

- `sass_match`: the regular expression that matches SASS content-type.

  **Default**: `/scss/`

- `less_match`: the regular expression that matches LESS content-type.

  **Default**: `/less/`

- `stylus_match`: the regular expression that matches STYLUS content-type.

  **Default**: `/stylus/`

- `coffee_match`: the regular expression that matches CoffeeScript content-type.

  **Default**: `/coffeescript/`

- `cache`: the directory for cache storage. Pass `false` to use a Memory cache handler.

  **Default**: `false`

- `blacklist`: an Array of RegExp. Requests matches any rules of blacklist will not be minified.
  
  **Default**: `null`

- `whitelist`: an Array of RegExp. If set, any requests don't match whitelist rules will not be minified. 
  
  **Default**: `null`
  
# Example

## Working with express static:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## Working with Gzip:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(express.compress());
app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## Working with dynamic response:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

var responseJS = 
    "(function(window, undefined)\n" +
    "{\n" +
    "\n" +
    "    var hello = 'hello';\n" +
    "\n" +
    "    var world = 'world';\n" +
    "\n" +
    "    alert(hello + world);\n" +
    "\n" +
    "})(window);"

app.use(minify());
app.get('/response.js', function(req, res)
{
    res.setHeader('Content-Type', 'application/javascript');
    res.end(responseJS);
});

app.listen(8080);
```

## Use file caching to improve performance:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify({cache: __dirname + '/cache'}));
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## Support CoffeeScript/LESS/SASS/Stylus parsing and minifying:

```javascript
// Test URL: http://localhost/auto_parsed_compressed.coffee

var minify = require('express-minify');
var express = require('express');
var app = express();

// Important!
express.static.mime.define(
{
    'text/coffeescript':  ['coffee'],
    'text/less':          ['less'],
    'text/x-scss':        ['scss'],
    'text/stylus':        ['styl']
});

app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## Do not minify this response!

When data is responded dynamicly and is changing all the time, it shouldn't be minified in order to save your CPU and disk space
(because dynamic data will not hit file cache).

You can simply set `_no_minify = true` to the `response` object to disable minifying (and also include CoffeeScript/Sass/... parsing) like this:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify());
app.get('/get_server_time.js', function(req, res)
{
    res._no_minify = true;    // do not minify this response!
    res.setHeader('Content-Type', 'application/javascript');
    res.end("MyLib.remoteCall(" + JSON.stringify({
        'id': '1',
        'data': {
            'timestamp': new Date().getTime()
        }
    }, null, 4) + ");");
});

app.listen(8080);
```

## Whitelist and Blacklist

### Blacklist

Will not minify `*.min.css` and `*.min.js`:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify(
{
    blacklist: [
        /\.min\.(css|js)$/
    ]
}));
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

### Blacklist and whitelist priorities

1. won't minify if `res._no_minify == true`

2. won't minify if matches any rules in the blacklist

3. if whitelist is set, won't minify if doesn't matches any rules in the whitelist

4. perform minify operations


# Notice

If you are using `cluster`, it is recommended to use express-minify with file cache enabled.

# Licence

(The MIT License)

Copyright (c) 2013 Breezewish. <http://breeswish.org>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.