var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify(__dirname + '/static', {cacheFile: __dirname + '/cache.json'}));
app.use(express.static(__dirname + '/static'));

app.listen(8080);