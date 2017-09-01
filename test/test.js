var crypto = require('crypto');
var http = require('http');
var async = require('async');
var zlib = require('zlib');
var request = require('supertest');
var should = require('should');

var minify = require('..');
var compression = require('compression');

var expectation = {
  'js': [
    {
      source: '(function(undefined) {  window.hello = "world"; \n /* comment */ window.f = false; })(); // comment',
      minified: 'window.hello="world",window.f=!1;',
    },
    {
      source: '(function(undefined) { window.hello_world = "世界你好！"; // 中文测试\n })();',
      minified: 'window.hello_world="世界你好！";',
    },
  ],
  'css': [
    {
      source: 'body {   background-color: #FFFFFF;   }   body  { font-size: 12px; margin: 0px }  ',
      minified: 'body{background-color:#fff}body{font-size:12px;margin:0}',
    },
    {
      source: 'body { font-family: "微软雅黑"; margin: 0px; } ',
      minified: 'body{font-family:"微软雅黑";margin:0}',
    },
  ],
  'json': [
    {
      source: '{  "name" : "express-minify" , "author" : "Breezewish" , "description" : "test string"}',
      minified: '{"name":"express-minify","author":"Breezewish","description":"test string"}',
    },
  ],
  'sass': [
    {
      source: '#navbar { a { font-weight: bold; } }',
      compiled: '#navbar a {\n  font-weight: bold; }\n',
      minified: '#navbar a{font-weight:700}',
    },
  ],
  'less': [
    {
      source: '.class { width: (1 + 1)px }',
      compiled: '.class {\n  width: 2 px;\n}\n',
      minified: '.class{width:2 px}',
    },
  ],
  'stylus': [
    {
      source: 'fonts = helvetica, arial, sans-serif\nbody {\n  padding: 50px;\n  font: 14px/1.4 fonts;\n}',
      compiled: 'body {\n  padding: 50px;\n  font: 14px/1.4 helvetica, arial, sans-serif;\n}\n',
      minified: 'body{padding:50px;font:14px/1.4 helvetica,arial,sans-serif}',
    },
  ],
  'coffeeScript': [
    {
      source: 'square = (x) -> x * x\nconsole.log square(5)',
      compiled: '(function() {\n  var square;\n\n  square = function(x) {\n    return x * x;\n  };\n\n  console.log(square(5));\n\n}).call(this);\n',
      minified: '(function(){var n;n=function(n){return n*n},console.log(n(5))}).call(this);',
    },
  ],
};

var header = {
  'js': 'text/javascript',
  'css': 'text/css',
  'sass': 'text/x-scss',
  'less': 'text/less',
  'stylus': 'text/stylus',
  'coffeeScript': 'text/coffeescript',
  'json': 'application/json'
};

describe('minify()', function() {

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
    .expect('Content-Length', new Buffer(content).length.toString(), done);
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


  it('allow to disable mangling by customizing uglify-js options', function(done) {
    var content = '// this is comment\nwindow.foo = function(bar) { bar(1); };';
    var expected = 'window.foo=function(bar){bar(1)};'
    var server = createServer([minify()], function(req, res) {
      res.setHeader('Content-Type', 'text/javascript');
      res.minifyOptions = {js: { mangle: false }};
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(expected, done);
  });


  it('allow to preserve comments by customizing uglify-js options', function(done) {
    var content = '// this is comment\nwindow.foo = function(bar) { bar(1); };';
    var expected = '// this is comment\nwindow.foo=function(o){o(1)};'
    var server = createServer([minify()], function(req, res) {
      res.setHeader('Content-Type', 'text/javascript');
      res.minifyOptions = {js: { output: { comments: true } }};
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(expected, done);
  });


  it('allow to customize error handling for minifying errors', function(done) {
    var content = '/* this is a broken JavaScript!';
    var expected = '{"assetType":"js","options":{},"stage":"minify","error":{"message":"Unterminated multiline comment","filename":"0","line":1,"col":0,"pos":0},"body":"/* this is a broken JavaScript!"}'
    var server = createServer([minify({
      errorHandler: function (errorInfo, callback) {
        callback(null, JSON.stringify(errorInfo));
      }
    })], function(req, res) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(expected, done);
  });


  it('allow to customize error handling for compiling errors', function(done) {
    var content = 'body { color: rgba( }';
    var expected = '{"assetType":"stylus","options":{},"stage":"compile","error":{"name":"ParseError","message":"stylus:1:22\\n   1| body { color: rgba( }\\n---------------------------^\\n\\nexpected \\")\\", got \\"}\\"\\n"},"body":"body { color: rgba( }"}'
    var server = createServer([minify({
      errorHandler: function (errorInfo, callback) {
        callback(null, JSON.stringify(errorInfo));
      }
    })], function(req, res) {
      res.setHeader('Content-Type', 'text/stylus');
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(expected, done);
  });


  it('allow to customize UglifyJS instance', function(done) {
    var content = 'js_test';
    var expected = 'js_test_passed';
    var myModule = {
      minify: function () {
        return {
          code: expected,
          error: undefined,
        }
      }
    };
    var server = createServer([minify({
      uglifyJsModule: myModule
    })], function(req, res) {
      res.setHeader('Content-Type', 'text/javascript');
      res.end(content);
    });
    request(server)
    .get('/')
    .expect(expected, done);
  });


  for (var type in expectation) {
    (function(type) {
      expectation[type].forEach(function(test) {

        it('should minify ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.end(test.source);
          });
          request(server)
          .get('/')
          .expect(test.minified, done);
        });


        it('should remove content-length for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.setHeader('Content-Length', new Buffer(test.source).length);
            res.end(test.source);
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
          opt[type + 'Match'] = /^text\/custom$/;
          var server = createServer([minify(opt)], function(req, res) {
            res.setHeader('Content-Type', 'text/custom');
            res.end(test.source);
          });
          request(server)
          .get('/')
          .expect(test.minified, done);
        });


        it('should not process or minify content when enabled == false occurs before setHeader for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.minifyOptions = {enabled: false};
            res.setHeader('Content-Type', header[type]);
            res.end(test.source);
          });
          request(server)
          .get('/')
          .expect(test.source, done);
        });


        it('should not process or minify content when enabled == false occurs after setHeader for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.minifyOptions = {enabled: false};
            res.end(test.source);
          });
          request(server)
          .get('/')
          .expect(test.source, done);
        });


        it('should not remove content-length when enabled == false occurs before setHeader for ' + header[type], function(done) {
          var server = createServer([minify()], function(req, res) {
            res.minifyOptions = {enabled: false};
            res.setHeader('Content-Type', header[type]);
            res.setHeader('Content-Length', new Buffer(test.source).length);
            res.end(test.source);
          });
          request(server)
          .get('/')
          .expect('Content-Length', new Buffer(test.source).length.toString(), done);
        });


        if (test.compiled) {
          it('should process but not minify content when minify == false occurs before setHeader for ' + header[type], function(done) {
            var server = createServer([minify()], function(req, res) {
              res.minifyOptions = {minify: false}
              res.setHeader('Content-Type', header[type]);
              res.end(test.source);
            });
            request(server)
            .get('/')
            .expect(test.compiled, done);
          });


          it('should process but not minify content when minify == false occurs after setHeader for ' + header[type], function(done) {
            var server = createServer([minify()], function(req, res) {
              res.setHeader('Content-Type', header[type]);
              res.minifyOptions = {minify: false}
              res.end(test.source);
            });
            request(server)
            .get('/')
            .expect(test.compiled, done);
          });
        }


        it('should work with express-compression for ' + header[type], function(done) {
          var server = createServer([compression({threshold: 0}), minify()], function(req, res) {
            res.setHeader('Content-Type', header[type]);
            res.setHeader('Content-Length', new Buffer(test.source).length);
            res.end(test.source);
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
                body.toString().should.equal(test.minified);
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
