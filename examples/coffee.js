// Test URL: http://localhost/auto_parsed_compressed.coffee

var minify = require('express-minify');
var express = require('express');
var app = express();

// Important!
express.static.mime.define(
{
    'text/coffeescript':  ['coffee'],
    'text/less':          ['less'],
    'text/x-scss':        ['scss'],
    'text/stylus':        ['styl']
});

app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);