var crypto = require('crypto');
var onHeaders = require('on-headers');

var Factory = function (options) {
  return createMiddleware(options);
};

Factory.Cache = require('./cache.js');
Factory.Minifier = require('./minifier.js');

module.exports = Factory;

var createMiddleware = function express_minify(options) {
  options = options || {};

  var js_match = options.js_match || /javascript/;
  var css_match = options.css_match || /css/;
  var sass_match = options.sass_match || /scss/;
  var less_match = options.less_match || /less/;
  var stylus_match = options.stylus_match || /stylus/;
  var coffee_match = options.coffee_match || /coffeescript/;
  var json_match = options.json_match || /json/;

  var cache = new Factory.Cache(options.cache || false);
  var minifier = new Factory.Minifier(options.uglifyJS, options.cssmin, options.onerror);

  return function express_minify_middleware(req, res, next) {
    var write = res.write;
    var end = res.end;

    var buf = null;
    var type = Factory.Minifier.TYPE_TEXT;

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
      if (minifier.sass !== false && sass_match.test(contentType)) {
        type = Factory.Minifier.TYPE_SASS;
        res.setHeader('Content-Type', 'text/css');
      } else if (minifier.less !== false && less_match.test(contentType)) {
        type = Factory.Minifier.TYPE_LESS;
        res.setHeader('Content-Type', 'text/css');
      } else if (minifier.stylus !== false && stylus_match.test(contentType)) {
        type = Factory.Minifier.TYPE_STYLUS;
        res.setHeader('Content-Type', 'text/css');
      } else if (minifier.coffee !== false && coffee_match.test(contentType)) {
        type = Factory.Minifier.TYPE_COFFEE;
        res.setHeader('Content-Type', 'text/javascript');
      } else if (json_match.test(contentType)) {
        type = Factory.Minifier.TYPE_JSON;
      } else if (js_match.test(contentType)) {
        type = Factory.Minifier.TYPE_JS;
      } else if (css_match.test(contentType)) {
        type = Factory.Minifier.TYPE_CSS;
      }

      if (type === Factory.Minifier.TYPE_TEXT) {
        return;
      }

      if ((type === Factory.Minifier.TYPE_JS || type === Factory.Minifier.TYPE_CSS) && res._no_minify) {
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
      var self = this;

      cache.layer.get(cacheKey, function (err, minized) {
        if (err) {
          // cache miss
          minifier.compileAndMinify(type, minifyOptions, buffer.toString(encoding), function (err, minized) {
            if (self._no_cache || err) {
              // do not cache the response body
              write.call(self, minized, 'utf8');
              end.call(self);
            } else {
              cache.layer.put(cacheKey, minized, function () {
                write.call(self, minized, 'utf8');
                end.call(self);
              });
            }
          });
        } else {
          // cache hit
          write.call(self, minized, 'utf8');
          end.call(self);
        }
      });
    };

    next();
  };
};
