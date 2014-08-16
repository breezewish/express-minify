express-minify
==============

express-minify is an express middleware to automatically minify and cache your javascript and css files.

It also supports LESS/SASS/Stylus/CoffeeScript compiling and minifying.

# Note

For better performance and more powerful features (eg: generate Javascript Maps), I recommend you to use [Grunt](http://gruntjs.com/) (The Javascript Task Runner)
to complete these tasks such as minifying and LESS/SASS/Stylus/CoffeeScript compiling.

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
app.use(minify(
{
    js_match: /javascript/,
    css_match: /css/,
    sass_match: /scss/,
    less_match: /less/,
    stylus_match: /stylus/,
    coffee_match: /coffeescript/,
    cache: false
}));
```

- `js_match`: `RegExp`
  
  matches JavaScript content-type.

- `css_match`: `RegExp`
  
  matches css content-type.

- `sass_match`: `RegExp`
  
  matches SASS content-type.

- `less_match`: `RegExp`
  
  matches LESS content-type.

- `stylus_match`: `RegExp`
  
  matches STYLUS content-type.

- `coffee_match`: `RegExp`
  
  matches CoffeeScript content-type.

- `cache`: `String | false`
  
  the directory for cache storage (must be writeable). Pass `false` to cache in the memory (not recommended).

# Examples

## Working with express-static:

```javascript
app.use(minify());
app.use(express.static(__dirname + '/static'));
```

## Working with express-compression(gzip):

```javascript
app.use(compression());
app.use(minify());
```

## Minify dynamic responses:

```javascript
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
```

## Use file cache to improve performance:

```javascript
app.use(minify({cache: __dirname + '/cache'}));
app.use(express.static(__dirname + '/static'));
```

## Parse and minify CoffeeScript/LESS/SASS/Stylus:

```javascript
// Test URL: http://localhost/auto_parsed_compressed.coffee

express.static.mime.define(
{
    'text/coffeescript':  ['coffee'],
    'text/less':          ['less'],
    'text/x-scss':        ['scss'],
    'text/stylus':        ['styl']
});

app.use(minify());
```

## Disable mangle for a specific response

use `response._no_mangle = true`.

Generally you may need this if you are using AngularJs:

```javascript
app.use(function(req, res, next)
{
    // do not mangle -angular.js files
    if (/-angular\.js$/.test(req.url)) {
        res._no_mangle = true;
    }
    next();
});
app.use(minify());
```

## Disable minify or cache for a specific response

If you don't want to minify a specific response, just use: `response._no_minify = true`. Notice that this would also disabling CoffeeScript/SCSS/LESS/Stylus parsing for this response.

If you want to minify a response but don't want to cache it (for example, dynamic data), use: `response._no_cache = true`.

Example:

```javascript
app.use(function(req, res, next)
{
    // for all *.min.css or *.min.js, do not minify it
    if (/\.min\.(css|js)$/.test(req.url)) {
        res._no_minify = true;
    }
    next();
});
app.use(minify());
```

Yet another example:

```javascript
app.use(minify());
app.get('/server_time_min.jsonp', function(req, res)
{
    var obj = {
        'ok': true,
        'data': {
            'timestamp': new Date().getTime()
        }
    };

    // minify this response, but do not cache it
    res._no_cache = true;
    res.setHeader('Content-Type', 'application/javascript');
    res.send("callback(" + JSON.stringify(obj, null, 4) + ");");
});
app.get('/server_time.jsonp', function(req, res)
{
    var obj = {
        'ok': true,
        'data': {
            'timestamp': new Date().getTime()
        }
    };

    // do not minify this response
    res._no_minify = true;
    res.setHeader('Content-Type', 'application/javascript');
    res.send("callback(" + JSON.stringify(obj, null, 4) + ");");
});
```

WARNING: DO NOT set `_no_minify` between `res.write` and `res.end`. It may lose data!

# Notice

If you are using `cluster`, it is strongly recommended to enable file cache.

# Change log

0.0.11

- Update dependencies [#11](https://github.com/breeswish/express-minify/issues/11)

0.0.10

- Added tests

- Fixed SASS compiling

- Fixed express-compression compatibility

0.0.9

- Added support for `res._no_mangle` [#10](https://github.com/breeswish/express-minify/pull/10)

0.0.8

- Removed options of `whitelist` and `blacklist`

- Added support for `res._no_cache` [#5](https://github.com/breeswish/express-minify/issues/5)

- Node v0.10 compatible

0.0.7

- Changed `options`'s default `blacklist` to `[/\.min\.(css|js)$/]`

- Replaced `uglifycss` with `cssmin`

- Dropped support for `.sass` (https://github.com/andrew/node-sass/issues/12)

- Fixed [#3](https://github.com/breeswish/express-minify/issues/3)

0.0.6

- Support for blacklist and whitelist [#2](https://github.com/breeswish/express-minify/issues/2)

0.0.5

- Added support for `res._no_minify`

- Fixed [#1](https://github.com/breeswish/express-minify/issues/1)

0.0.4

- Support for LESS/SASS/Stylus/CoffeeScript parsing and minifying

0.0.3

- Support for file cache

- Fixed the bug of non-string path

0.0.2

- Support for dynamic minifying

# License

The MIT License (MIT)

Copyright (c) 2014 Breezewish

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.