express-minify
==============

express-minify is an express middleware that automatically minify and cache your javascript and css files. It also supports LESS/SASS/Stylus/CoffeeScript dynamic processing and minifying.

Please feel free to contribute to this project :)

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

  **Default**: `/json|javascript/`
  
- `css_match`: the regular expression that matches css content-type.

  **Default**: `/css/`

- `sass_match`: the regular expression that matches SASS content-type.

  **Default**: `/(sass|scss)/`

- `less_match`: the regular expression that matches LESS content-type.

  **Default**: `/less/`

- `stylus_match`: the regular expression that matches STYLUS content-type.

  **Default**: `/stylus/`

- `coffee_match`: the regular expression that matches CoffeeScript content-type.

  **Default**: `/coffeescript/`

- `cache`: the directory for cache storage. Pass `false` to use a Memory cache handler.

  **Default**: `false`
  
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

## Working with GZIP:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(express.compress());
app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## Using file cache:

```javascript
var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify({cache: __dirname + '/cache'}));
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

## CoffeeScript/LESS/SASS/Stylus parsing and minifying:

```javascript
// http://localhost/auto_parsed_compressed.coffee

var minify = require('express-minify');
var express = require('express');
var app = express();

// Important!
express.static.mime.define(
{
	'text/coffeescript':	['coffee'],
	'text/less':			['less'],
	'text/x-sass':			['sass'],
	'text/x-scss':			['scss'],
	'text/stylus':			['styl']
});

app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);
```

# Notice

If you are using `cluster`, it is recommended to use express-minify with file cache enabled.

# Licence

(The MIT License)

Copyright (c) 2013 Breezewish. <http://breeswish.org>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.