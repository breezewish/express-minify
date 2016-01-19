express-minify
==============
[![Build Status](https://travis-ci.org/SummerWish/express-minify.svg?branch=master)](https://travis-ci.org/SummerWish/express-minify) [![npm version](https://img.shields.io/npm/v/express-minify.svg)](https://www.npmjs.com/package/express-minify) [![npm download counter](https://img.shields.io/npm/dm/express-minify.svg)](https://www.npmjs.com/package/express-minify)

[![Dependency Status](https://david-dm.org/SummerWish/express-minify.svg)](https://david-dm.org/SummerWish/express-minify) [![devDependency Status](https://david-dm.org/SummerWish/express-minify/dev-status.svg)](https://david-dm.org/SummerWish/express-minify#info=devDependencies)

[![NodeICO](https://nodei.co/npm/express-minify.png?downloads=true&downloadRank=true&stars=true)](https://www.npmjs.com/package/express-minify)

Automatically minify and cache your javascript and css files.

It also supports [LESS/SASS/Stylus/CoffeeScript compiling and minifying](#parse-and-minify-coffeescriptlesssassstylus).

# Installation

```
npm install express-minify
```

# Basic Usage

```javascript
var minify = require('express-minify');
app.use(minify());
```

## Default Options

```javascript
app.use(minify({
  js_match: /javascript/,
  css_match: /css/,
  sass_match: /scss/,
  less_match: /less/,
  stylus_match: /stylus/,
  coffee_match: /coffeescript/,
  json_match: /json/,
  uglifyJS: undefined,
  cssmin: undefined,
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

- `json_match`: `RegExp`
  
  matches JSON content-type.

- `uglifyJS`: `Object`
  
  customize UglifyJS instance (`require('uglify-js')`).
  
- `cssmin`: `Object`

  customize cssmin instance (`require('cssmin')`).

- `cache`: `String | false`
  
  the directory for cache storage (must be writeable). Pass `false` to cache in the memory (not recommended).

## Per-Response Options

- `res._skip`

  Pass `true` to disable all kind of processing (minifying & precompiling).

- `res._no_minify`

  Pass `true` to disable minifying.

- `res._no_cache`

  Pass `true` to disable caching response data.

### UglifyJs Options

- `res._uglifyMangle`

  Pass `false` to disable mangling names when minifying JavaScript for this response.

- `res._uglifyOutput`

  Pass an object if you wish to specify additional UglifyJs [output options](http://lisperator.net/uglifyjs/codegen) when minifying JavaScript for this response.

- `res._uglifyCompress`

  Pass an object to specify custom UglifyJs [compressor options](http://lisperator.net/uglifyjs/compress) (pass `false` to skip) when minifying JavaScript for this response.

# Examples

## Working with express-static:

```javascript
app.use(minify());
app.use(express.static(__dirname + '/static'));
```

## Working with express-compression (gzip):

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

You can use a file cache instead of the default memory cache to reduce memory usage.

You need to specify a writable directory to store those cache file.

```javascript
app.use(minify({cache: __dirname + '/cache'}));
app.use(express.static(__dirname + '/static'));
```

## Parse and minify CoffeeScript/LESS/SASS/Stylus:

`express-minify` can automatically compile your files and minify it without the need of specifying a source file directory. Currently it supports coffee-script, less, sass and stylus.

To enable this feature, first of all you need to install those modules by yourself:

```
# you needn't install all of those modules
# only choose what you want
npm install coffee-script less node-sass stylus --save
```

Then you need to define MIME for those files:

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

**Notice**: Those modules are listed in `devDependencies` for testing purpose. If you don't manually add them to your project's `dependencies`, you may face errors when switching from npm dev install to npm production install because they are no longer installed by express-minify.

**Change since 0.1.6**: You need to manually install those modules to enable this feature.

## Customize UglifyJS/cssmin instance

If you want to use your own UglifyJS/cssmin instance (for example, use a different branch to support ES6), you can pass them to the options.

```javascript
var myUglifyJS = require('uglify-js');
var myCssmin = require('cssmin');
app.use(minify({
  uglifyJS: myUglifyJS,
  cssmin: myCssmin,
}));
```

Notice: You may need to clear file cache after switching to your own UglifyJS/cssmin instance because cache may be outdated.

## Specify UglifyJs options

`response._uglifyMangle`: pass false to skip mangling names.

Example: Disable mangle for AngularJs.

```javascript
app.use(function(req, res, next)
{
    // do not mangle -angular.js files
    if (/-angular\.js$/.test(req.url)) {
        res._uglifyMangle = true;
    }
    next();
});
app.use(minify());
```

`response._uglifyOutput`: specify UglifyJs additional [output options](http://lisperator.net/uglifyjs/codegen).

Example: Preserve comments for specific files.

```javascript
app.use(function(req, res, next)
{
    if (/\.(user|meta)\.js$/.test(req.url)) {
        res._uglifyOutput = {
            comments: true
        };
    }
    next();
});
```

`response._uglifyCompress`: specify UglifyJs custom [compressor options](http://lisperator.net/uglifyjs/compress).

## Disable minifying or caching for a response

If you don't want to minify a specific response, just use `response._no_minify = true`.

If you want to minify a response but don't want to cache it (for example, dynamic response data), use: `response._no_cache = true`.

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

**WARNING**: Do NOT set `_no_minify` between `res.write` and `res.end`.

# Notice

If you are using `cluster`, it is strongly recommended to enable file cache. They can share file caches.

# Change log

0.1.7

- Support customizing UglifyJS/cssmin instance

0.1.6

- Make `node-sass`, `stylus`, `less`, `coffee-script` dependency optional, now developers need to manually install those modules to enable compiling

0.1.5

- Fix MIME for Js
- Fix JSON minify performance issue

0.1.4

- Add some useful badges [#27](https://github.com/SummerWish/express-minify/pull/27)
- Update dependencies
- Support JSON minify [#25](https://github.com/SummerWish/express-minify/pull/25)
- Start to use travis-ci online build testing

0.1.3

- Update dependencies [#19](https://github.com/breeswish/express-minify/issues/19) [#20](https://github.com/breeswish/express-minify/issues/20)

0.1.2

- Added `res._skip`.
- Modified behaviour of `res._no_minify`. Now it will only disable minifying and won't cause precompiling not working. [#17](https://github.com/breeswish/express-minify/issues/17)
- Fixed cache bugs with response options.

0.1.1

- Added fallback for `res._no_mangle = true` (Please use `res._uglifyMangle = false`)
- Update dependencies

0.1.0

- Changed disabling mangle: `res._no_mangle = true` => `res._uglifyMangle = false`
- Added support for passing additional UglifyJs options: `res._uglifyCompress`, `res._uglifyOutput` [#15](https://github.com/breeswish/express-minify/issues/15)

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