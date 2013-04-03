express-minify
==============

express-minify is an express middleware that **automatically** minify and **cache** your javascript and css files.

# How it works

For example, when requesting `/example.css` (assume that our static directory is `/home/www/static`):

1. Check whether the modification time of `/home/www/static/example.css` matches the cache.

2. **If there is no cache available or the cache is out of date:**

   2.1 Minify `/home/www/static/example.css`
   
   2.2 Save to `/home/www/static/example.css.minify.css`
   
   2.3 Update the modification time in the cache
   
   2.4 Rewrite the request to `/example.css.minify.css`

3. **If matches:**

   3.1 Rewrite the request to `/example.css.minify.css`

4. Next middleware will handle the request of `/example.css.minify.css`.

# Notice

1. express-minify cache minized content in the directory of the requested file.
   So please BE SURE that the static directory is **WRITEABLE**.

2. Minifying is a **BLOCK operation**! So it is **NOT RECOMMENDED** to use express-minify in productions.

# Installation

```
npm install express-minify
```

# Usage

```javascript
var minify = require('express-minify');
app.use(minify(__dirname + '/static', {cacheFile: __dirname + '/cache.json'}));
```

## Options:

- `suffix`: the suffix of the minized files.

  **Default**: `'minify'`
  
  **Note**: `suffix` will be used in regexp matchings. So be sure that you escaped symbols like `.` to `\.`.

- `match`: the regexp match of the files to be handled.

  **Default**: `'\\.(js|css)$'`

- `cacheFile`: the path of the caching data file. Pass `null` to disable it.

  **Default**: `null`
  
  **Note**: If disabled, if your app has restarted, all files will be forced to minize one time no matter they have minized or not.

# Example

## Working with express static:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify(__dirname + '/static', {cacheFile: __dirname + '/cache.json'}));
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## Working with gzip:

```javascript
var minify = require('express-minify');
var express = require('express');
var gzippo = require('gzippo');
var app = express();

app.use(minify(__dirname + '/static', {cacheFile: __dirname + '/cache.json'}));
app.use(gzippo.staticGzip(__dirname + '/static'));

app.listen(8080);
```

# Licence

(The MIT License)

Copyright (c) 2013 Breezewish. <http://breeswish.org>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.