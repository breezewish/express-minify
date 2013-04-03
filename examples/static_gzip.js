var minify = require('express-minify');
var express = require('express');
var gzippo = require('gzippo');
var app = express();

app.use(minify(__dirname + '/static', {cacheFile: __dirname + '/cache.json'}));
app.use(gzippo.staticGzip(__dirname + '/static'));

app.listen(8080);