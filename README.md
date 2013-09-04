express-minify
==============

express-minify is an express middleware that automatically minify and cache your javascript and css files. It also supports LESS/SASS/Stylus/CoffeeScript dynamic processing and minifying.

Please be free to contribute to this project :)

# Note

For better performance and more powerful features (eg: generate Javascript Maps), I **strongly recommend** you to use [Grunt](http://gruntjs.com/) (The Javascript Task Runner)
to complete these tasks such as minifying and CoffeeScript/Stylus/LESS compiling.

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
    cache: false,
    blacklist: [/\.min\.(css|js)$/],
    whitelist: null
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

- `blacklist`: `[RegExp1, RegExp2, ...]`
  
  requests matches any rules of blacklist will not be minified.

- `whitelist`: `[RegExp1, RegExp2, ...]`
  
  if set, any requests not matching whitelist rules will not be minified. 
  
# Examples

## Working with express-static:

```javascript
app.use(minify());
app.use(express.static(__dirname + '/static'));
```

## Working with express-gzip:

```javascript
app.use(express.compress());
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

## Do not minify this response!

When data is responded dynamicly and is changing all the time, it shouldn't be minified in order to save your CPU and disk space
(because dynamic data will not hit file cache).

You can simply set `_no_minify = true` to the `response` object to disable minifying (and also include CoffeeScript/Sass/... parsing) like this:

```javascript
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
```

## Whitelist and blacklist

### Blacklist

Will not minify `*.min.css` and `*.min.js`:

```javascript
app.use(minify(
{
    blacklist: [
        /\.min\.(css|js)$/    //default
    ]
}));
app.use(express.static(__dirname + '/static'));
```

### Blacklist and whitelist priorities

1. won't minify if `res._no_minify == true`

2. won't minify if matches any rules in the blacklist

3. if whitelist is set, won't minify if doesn't matches any rules in the whitelist

4. perform minify operations

# Notice

If you are using `cluster`, it is strongly recommended to enable file cache.

# Change log

0.0.7

- Changed `options`'s default `blacklist` to `[/\.min\.(css|js)$/]`

- Replaced `uglifycss` with `cssmin`

- Dropped support for `.sass` (https://github.com/andrew/node-sass/issues/12)

- Fixed [#3](https://github.com/breeswish/express-minify/issues/3)

0.0.6

- Support for blacklist and whitelist [#2](https://github.com/breeswish/express-minify/issues/2)

0.0.5

- Support for `res._no_minify`

- Fixed [#1](https://github.com/breeswish/express-minify/issues/1)

0.0.4

- Support for LESS/SASS/Stylus/CoffeeScript parsing and minifying

0.0.3

- Support for file cache

- Fixed the bug of non-string path

0.0.2

- Support for dynamic minifying

# Licence

(The MIT License)

Copyright (c) 2013 Breezewish. <http://breeswish.org>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.