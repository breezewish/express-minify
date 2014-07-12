var minify = require('express-minify');
var compression = require('compression');
var express = require('express');
var app = express();

app.use(compression());
app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);