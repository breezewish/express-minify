var extend = require('util')._extend;

/**
 * Test whether a module exists.
 * null for exists, false for not-exists.
 */
var testModule = function (name) {
  var module = null;
  try {
    require.resolve(name);
  } catch (ignore) {
    module = false;
  }
  return module;
};

var Minifier = function (uglifyJS, cssmin, errorHandler) {
  this.handleError = errorHandler || Minifier.defaultErrorHandler;
  this.uglifyJS = uglifyJS || require('uglify-js');
  this.cssmin = cssmin || require('cssmin');
  this.sass = testModule('node-sass');
  this.less = testModule('less');
  this.stylus = testModule('stylus');
  this.coffee = testModule('coffee-script');
};

Minifier.TYPE_TEXT = 0;
Minifier.TYPE_JS = 1;
Minifier.TYPE_CSS = 2;
Minifier.TYPE_SASS = 3;
Minifier.TYPE_LESS = 4;
Minifier.TYPE_STYLUS = 5;
Minifier.TYPE_COFFEE = 6;
Minifier.TYPE_JSON = 7;

Minifier.defaultErrorHandler = function (err, stage, assetType, minifyOptions, body, callback) {
  if (stage === 'compile') {
    callback(err, JSON.stringify(err));
    return;
  }
  callback(err, body);
};

Minifier.prototype.compileAndMinify = function (assetType, minifyOptions, body, callback) {
  if (typeof callback !== 'function') {
    return;
  }

  var self = this;
  var result, opt;

  switch (assetType) {
  case Minifier.TYPE_JS:
    result = body;
    try {
      if (!minifyOptions.noMinify) {
        opt = extend({fromString: true}, minifyOptions.uglifyOpt);
        result = self.uglifyJS.minify(result, opt).code;
      }
    } catch (err) {
      self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
      return;
    }
    callback(null, result);
    break;
  case Minifier.TYPE_CSS:
    result = body;
    try {
      if (!minifyOptions.noMinify) {
        result = self.cssmin(result);
      }
    } catch (err) {
      self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
      return;
    }
    callback(null, result);
    break;
  case Minifier.TYPE_SASS:
    if (!self.sass) {
      self.sass = require('node-sass');
    }
    result = body;
    try {
      result = self.sass.renderSync({
        data: result
      }).css.toString();
    } catch (err) {
      self.handleError(err, 'compile', assetType, minifyOptions, result, callback);
      return;
    }
    try {
      if (!minifyOptions.noMinify) {
        result = self.cssmin(result);
      }
    } catch (err) {
      self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
      return;
    }
    callback(null, result);
    break;
  case Minifier.TYPE_LESS:
    if (!self.less) {
      self.less = require('less');
    }
    result = body;
    self.less.render(result, function (err, output) {
      if (err) {
        self.handleError(err, 'compile', assetType, minifyOptions, result, callback);
        return;
      }
      result = output.css;
      try {
        if (!minifyOptions.noMinify) {
          result = self.cssmin(result);
        }
      } catch (err) {
        self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
        return;
      }
      callback(null, result);
    });
    break;
  case Minifier.TYPE_STYLUS:
    if (!self.stylus) {
      self.stylus = require('stylus');
    }
    result = body;
    self.stylus.render(result, function (err, css) {
      if (err) {
        self.handleError(err, 'compile', assetType, minifyOptions, result, callback);
        return;
      }
      result = css;
      try {
        if (!minifyOptions.noMinify) {
          result = self.cssmin(result);
        }
      } catch (err) {
        self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
        return;
      }
      callback(null, result);
    });
    break;
  case Minifier.TYPE_COFFEE:
    if (!self.coffee) {
      self.coffee = require('coffee-script');
    }
    result = body;
    try {
      result = self.coffee.compile(result);
    } catch (err) {
      self.handleError(err, 'compile', assetType, minifyOptions, result, callback);
      return;
    }
    try {
      if (!minifyOptions.noMinify) {
        opt = extend({fromString: true}, minifyOptions.uglifyOpt);
        result = self.uglifyJS.minify(result, opt).code;
      }
    } catch (err) {
      self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
      return;
    }
    callback(null, result);
    break;
  case Minifier.TYPE_JSON:
    result = body;
    try {
      if (!minifyOptions.noMinify) {
        result = JSON.stringify(JSON.parse(result));
      }
    } catch (err) {
      self.handleError(err, 'minify', assetType, minifyOptions, result, callback);
      return;
    }
    callback(null, result);
    break;
  default:
    callback(null, body);
    break;
  }
};

module.exports = Minifier;
