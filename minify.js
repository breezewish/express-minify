var fs = require('fs');
var extend = require('util')._extend;
var path = require('path');
var crypto = require('crypto');
var onHeaders = require('on-headers');

// js minifier and css minifier
var uglifyjs = require('uglify-js');
var cssmin = require('cssmin');

var sass = null;
try {
  require.resolve('node-sass');
} catch (ignore) {
  sass = false;
}

var less = null;
try {
  require.resolve('less');
} catch (ignore) {
  less = false;
}

var stylus = null;
try {
  require.resolve('stylus');
} catch (ignore) {
  stylus = false;
}

var coffee = null;
try {
  require.resolve('coffee-script');
} catch (ignore) {
  coffee = false;
}

var memCache = {};

var TYPE_TEXT = 0;
var TYPE_JS = 1;
var TYPE_CSS = 2;
var TYPE_SASS = 3;
var TYPE_LESS = 4;
var TYPE_STYLUS = 5;
var TYPE_COFFEE = 6;
var TYPE_JSON = 7;

function precompileError(err, assetType) {
  return JSON.stringify(err);
}

function minifyIt(assetType, options, minifiers, content, callback) {
  if (typeof callback !== 'function') {
    return;
  }

  var result, opt;

  switch (assetType) {
  case TYPE_JS:
    result = content;
    try {
      if (!options.noMinify) {
        opt = extend({fromString: true}, options.uglifyOpt);
        result = minifiers.uglifyJS.minify(result, opt).code;
      }
    } catch (ignore) {
    }
    callback(result);
    break;
  case TYPE_CSS:
    result = content;
    try {
      if (!options.noMinify) {
        result = minifiers.cssmin(content);
      }
    } catch (ignore) {
    }
    callback(result);
    break;
  case TYPE_SASS:
    if (!sass) {
      sass = require('node-sass');
    }
    try {
      result = sass.renderSync({
        data: content
      }).css.toString();
      try {
        if (!options.noMinify) {
          result = minifiers.cssmin(result);
        }
      } catch (ignore) {
      }
    } catch (err) {
      result = precompileError(err, assetType);
    }
    callback(result);
    break;
  case TYPE_LESS:
    if (!less) {
      less = require('less');
    }
    less.render(content, function (err, output) {
      if (err) {
        callback(precompileError(err, assetType));
        return;
      }
      result = output.css;
      try {
        if (!options.noMinify) {
          result = minifiers.cssmin(result);
        }
      } catch (ignore) {
      }
      callback(result);
    });
    break;
  case TYPE_STYLUS:
    if (!stylus) {
      stylus = require('stylus');
    }
    stylus.render(content, function (err, css) {
      if (err) {
        callback(precompileError(err, assetType));
        return;
      }
      result = css;
      try {
        if (!options.noMinify) {
          result = minifiers.cssmin(result);
        }
      } catch (ignore) {
      }
      callback(result);
    });
    break;
  case TYPE_COFFEE:
    if (!coffee) {
      coffee = require('coffee-script');
    }
    try {
      result = coffee.compile(content);
      try {
        if (!options.noMinify) {
          opt = extend({fromString: true}, options.uglifyOpt);
          result = minifiers.uglifyJS.minify(result, opt).code;
        }
      } catch (ignore) {
      }
    } catch (err) {
      result = precompileError(err, assetType);
    }
    callback(result);
    break;
  case TYPE_JSON:
    result = content;
    try {
      if (!options.noMinify) {
        result = JSON.stringify(JSON.parse(content));
      }
    } catch (ignore) {
    }
    callback(result);
    break;
  default:
    callback(content);
    break;
  }
}

function cacheGetFile(hash, callback) {
  if (typeof callback !== 'function') {
    return;
  }

  var filepath = this.toString();

  fs.readFile(filepath + hash, { encoding: 'utf8' }, function (err, data) {
    if (err) {
      callback(err);
      return;
    }
    try {
      data = JSON.parse(data).content;
      callback(null, data);
    } catch (jsonErr) {
      callback(jsonErr);
    }
  });
}

function cachePutFile(hash, minized, callback) {
  var filepath = this.toString();

  // fix issue #3
  // not ended file writing will cause wrong responding.
  // using temp files can mostly avoid the case.

  fs.writeFile(
    filepath + hash + '.tmp',
    JSON.stringify({content: minized}),
    { encoding: 'utf8' },
    function (err) {
      if (err) {
        return callback(err);
      }
      fs.rename(filepath + hash + '.tmp', filepath + hash, callback);
    }
  );
}

function cacheGetMem(hash, callback) {
  if (typeof callback !== 'function') {
    return;
  }

  if (!memCache.hasOwnProperty(hash)) {
    callback(new Error('miss'));
  } else {
    callback(null, memCache[hash]);
  }
}

function cachePutMem(hash, minized, callback) {
  memCache[hash] = minized;

  if (typeof callback === 'function') {
    callback(null);
  }
}

module.exports = function express_minify(options) {
  options = options || {};

  var minifierInstances = {
    uglifyJS: options.uglifyJS || uglifyjs,
    cssmin: options.cssmin || cssmin
  };

  var js_match = options.js_match || /javascript/;
  var css_match = options.css_match || /css/;
  var sass_match = options.sass_match || /scss/;
  var less_match = options.less_match || /less/;
  var stylus_match = options.stylus_match || /stylus/;
  var coffee_match = options.coffee_match || /coffeescript/;
  var json_match = options.json_match || /json/;
  var cache = options.cache || false;

  var cache_get = cacheGetMem;
  var cache_put = cachePutMem;

  if (cache) {
    cache = path.normalize(cache + '/').toString();

    fs.writeFile(cache + 'test.tmp', new Date().getTime().toString(), function (err) {
      if (err) {
        console.log('WARNING: express-minify cache directory is not valid or is not writeable.');
        return;
      }

      //Consider deleting the test file?

      //OK: rewrite functions
      cache_get = function () {
        return cacheGetFile.apply(cache, arguments);
      };
      cache_put = function () {
        return cachePutFile.apply(cache, arguments);
      };
    });
  }

  return function middleware(req, res, next) {
    var write = res.write;
    var end = res.end;

    var buf = null;
    var type = TYPE_TEXT;

    onHeaders(res, function () {
      if (req.method === 'HEAD') {
        return;
      }

      if (res._skip) {
        return;
      }

      var contentType = res.getHeader('Content-Type');
      if (contentType === undefined) {
        return;
      }

      // for sass, less, stylus, coffee module:
      //    null: module is found but not loaded
      //    false: module not found
      // so we should not process false values, but allow null values
      if (sass !== false && sass_match.test(contentType)) {
        type = TYPE_SASS;
        res.setHeader('Content-Type', 'text/css');
      } else if (less !== false && less_match.test(contentType)) {
        type = TYPE_LESS;
        res.setHeader('Content-Type', 'text/css');
      } else if (stylus !== false && stylus_match.test(contentType)) {
        type = TYPE_STYLUS;
        res.setHeader('Content-Type', 'text/css');
      } else if (coffee !== false && coffee_match.test(contentType)) {
        type = TYPE_COFFEE;
        res.setHeader('Content-Type', 'text/javascript');
      } else if (json_match.test(contentType)) {
        type = TYPE_JSON;
      } else if (js_match.test(contentType)) {
        type = TYPE_JS;
      } else if (css_match.test(contentType)) {
        type = TYPE_CSS;
      }

      if (type === TYPE_TEXT) {
        return;
      }

      if ((type === TYPE_JS || type === TYPE_CSS) && res._no_minify) {
        return;
      }

      res.removeHeader('Content-Length');

      // prepare the buffer
      buf = [];
    });

    res.write = function (chunk, encoding) {
      if (!this._header) {
        this._implicitHeader();
      }

      if (buf === null) {
        return write.call(this, chunk, encoding);
      }

      if (!this._hasBody) {
        return true;
      }

      if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
        throw new TypeError('first argument must be a string or Buffer');
      }

      if (chunk.length === 0) {
        return true;
      }

      // no chunked_encoding here
      if (typeof chunk === 'string') {
        chunk = new Buffer(chunk, encoding);
      }

      buf.push(chunk);
    };

    res.end = function (data, encoding) {
      if (this.finished) {
        return false;
      }

      if (!this._header) {
        this._implicitHeader();
      }

      if (data && !this._hasBody) {
        data = false;
      }

      if (buf === null) {
        return end.call(this, data, encoding);
      }

      // TODO: implement hot-path optimization
      if (data) {
        this.write(data, encoding);
      }

      var buffer = Buffer.concat(buf);

      // prepare uglify options
      var uglifyOptions = {};
      if (this._no_mangle) {
        uglifyOptions.mangle = false;
      }
      if (this._uglifyMangle !== undefined) {
        uglifyOptions.mangle = this._uglifyMangle;
      }
      if (this._uglifyOutput !== undefined) {
        uglifyOptions.output = this._uglifyOutput;
      }
      if (this._uglifyCompress !== undefined) {
        uglifyOptions.compress = this._uglifyCompress;
      }

      var minifyOptions = {
        uglifyOpt: uglifyOptions,
        noMinify: this._no_minify
      };

      var cacheKey = crypto.createHash('sha1').update(JSON.stringify(minifyOptions) + buffer).digest('hex').toString();
      var _this = this;

      cache_get(cacheKey, function (err, minized) {
        if (err) {
          // cache miss
          minifyIt(type, minifyOptions, minifierInstances, buffer.toString(encoding), function (minized) {
            if (_this._no_cache) {
              // do not save cache for this response
              write.call(_this, minized, 'utf8');
              end.call(_this);
            } else {
              cache_put(cacheKey, minized, function () {
                write.call(_this, minized, 'utf8');
                end.call(_this);
              });
            }
          });
        } else {
          // cache hit
          write.call(_this, minized, 'utf8');
          end.call(_this);
        }
      });
    };

    next();
  };
};
