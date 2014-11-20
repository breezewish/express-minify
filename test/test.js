var crypto = require('crypto');
var http = require('http');
var async = require('async');
var zlib = require('zlib');
var request = require('supertest');
var should = require('should');

var minify = require('..');
var compression = require('compression');

var uglifyjs = require('uglify-js');
var cssmin = require('cssmin');
var sass = require('node-sass');
var less = require('less');
var stylus = require('stylus');
var coffee = require('coffee-script');

var expectation = {
  'js': [
    {src: '(function(undefined) {  window.hello = "world"; \n /* comment */ window.f = false; })(); // comment'},
    {src: '(function(undefined) { window.hello_world = "世界你好！"; // 中文测试\n })();'}
  ],
  'css': [
    {src: 'body {   background-color: #FFFFFF;   }   body  { font-size: 12px; margin: 0px }  '},
    {src: 'body { font-family: "微软雅黑"; margin: 0px; } '}
  ],
  'sass': [
    {src: '#navbar { a { font-weight: bold; } }'}
  ],
  'less': [
    {src: '.class { width: (1 + 1)px }'}
  ],
  'stylus': [
    {src: 'fonts = helvetica, arial, sans-serif\nbody {\n  padding: 50px;\n  font: 14px/1.4 fonts;\n}'}
  ],
  'coffee': [
    {src: 'square = (x) -> x * x'}
  ]
};

var header = {
  'js': 'text/javascript',
  'css': 'text/css',
  'sass': 'text/x-scss',
  'less': 'text/less',
  'stylus': 'text/stylus',
  'coffee': 'text/coffeescript'
};

describe('minify()', function() {

  before(function(done) {
    init(done);
  });

  it('should not minify normal content', function(done) {
    var content = 'hello, world';
    var server = createServer([minify()], function(req, res) {
      res.setHeader('Content-Type', 'text/plain');
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(content, done);
  });


  it('should not minify normal content with Chinese characters', function(done) {
    var content = '世界你好！Hello world.';
    var server = createServer([minify()], function(req, res) {
      res.setHeader('Content-Type', 'text/plain');
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(content, done);
  });


  it('should not minify without content-type', function(done) {
    var content = 'hello, world';
    var server = createServer([minify()], function(req, res) {
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(content, done);
  });


  it('should not remove content-length for normal content', function(done) {
    var content = 'hello, world';
    var server = createServer([minify()], function(req, res) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', new Buffer(content).length);
      res.end(content);
    });
    request(server)
    .get('/')
    .expect('Content-Length', new Buffer(content).length, done);
  });


  it('should not minify a broken JavaScript content', function(done) {
    var content = '/* this is a broken JavaScript!';
    var server = createServer([minify()], function(req, res) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(content, done);
  });


  for (var type in expectation) {
    (function(type) {
      expectation[type].forEach(function(test) {

        it('should minify ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.end(test.src);
          });
          request(server)
          .get('/')
          .expect(test.result, done);
        });


        it('should remove content-length for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.setHeader('Content-Length', new Buffer(test.src).length);
            res.end(test.src);
          });
          request(server)
          .get('/')
          .end(function(err, res) {
            if (err) return done(err);
            res.headers.should.not.have.property('content-length');
            done();
          });
        });


        it('should work with a custom content-type (original: ' + header[type] + ')', function(done) {
          var opt = {};
          opt[type + '_match'] = /^text\/custom$/;
          var server = createServer([minify(opt)], function(req, res) {
            res.setHeader('Content-Type', 'text/custom');
            res.end(test.src);
          });
          request(server)
          .get('/')
          .expect(test.result, done);
        });


        it('should not minify content when _no_minify = true occurs before setHeader for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res._no_minify = true;
            res.setHeader('Content-Type', header[type]);
            res.end(test.src);
          });
          request(server)
          .get('/')
          .expect(test.src, done);
        });


        it('should not minify content when _no_minify = true occurs after setHeader for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res._no_minify = true;
            res.end(test.src);
          });
          request(server)
          .get('/')
          .expect(test.src, done);
        });


        it('should not remove content-length when _no_minify = true occurs before setHeader for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res._no_minify = true;
            res.setHeader('Content-Type', header[type]);
            res.setHeader('Content-Length', new Buffer(test.src).length);
            res.end(test.src);
          });
          request(server)
          .get('/')
          .expect('Content-Length', new Buffer(test.src).length, done);
        });


        it('should work with express-compression for ' + header[type], function(done) {
          var server = createServer([compression({threshold: 0}), minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.setHeader('Content-Length', new Buffer(test.src).length);
            res.end(test.src);
          });

          var buf = [];

          request(server)
          .get('/')
          .set('Accept-Encoding', 'gzip')
          .request()
          .on('response', function (res) {
            res.headers['content-encoding'].should.equal('gzip');
            res.on('data', function(data) {
              buf.push(data);
            });
            res.on('end', function(){
              zlib.gunzip(Buffer.concat(buf), function(err, body) {
                if (err) return done(err);
                body.toString().should.equal(test.result);
                done();
              });
            });
          })
          .end();
        });

      });
    })(type);
  }

});

function init(callback) {

  var minifyFunc = {};

  minifyFunc.js = function(content, callback) {
    callback(uglifyjs.minify(content, {fromString: true}).code);
  }

  minifyFunc.css = function(content, callback) {
    callback(cssmin(content));
  }

  minifyFunc.sass = function(content, callback) {
    callback(cssmin(sass.renderSync(content)));
  }

  minifyFunc.less = function(content, callback) {
    less.render(content, function(err, output) {
      if (err) {
        callback(content);
        return;
      }
      var css = output.css;
      callback(cssmin(css));
    });
  }

  minifyFunc.stylus = function(content, callback) {
    stylus.render(content, function(err, css) {
      if (err) {
        callback(content);
      } else {
        callback(cssmin(css));
      }
    });
  }

  minifyFunc.coffee = function(content, callback) {
    var js = coffee.compile(content);
    callback(uglifyjs.minify(js, {fromString: true}).code);
  }

  // generate expectations
  async.eachSeries(Object.keys(expectation), function(type, callback) {
    async.eachSeries(expectation[type], function(test, callback) {
      minifyFunc[type](test.src, function(r) {
        test.result = r;
        callback();
      });
    }, callback);
  }, callback);
  
}

function createServer(middlewares, fn) {
  return http.createServer(function(req, res) {
    async.eachSeries(middlewares, function(middleware, callback) {
      middleware(req, res, callback)
    }, function(err) {
      if (err) {
        res.statusCode = err.status || 500
        res.end(err.message)
        return;
      }
      fn(req, res);
    });
  });
}