var minify = require('express-minify');
var express = require('express');
var app = express();

var responseJS = 
    "(function(window, undefined)\n" +
    "{\n" +
    "\n" +
    "    var hello = 'hello';\n" +
    "\n" +
    "    var world = 'world';\n" +
    "\n" +
    "    alert(hello + world);\n" +
    "\n" +
    "})(window);"

app.use(minify());
app.get('/response.js', function(req, res)
{
    res.setHeader('Content-Type', 'application/javascript');
    res.end(responseJS);
});

app.listen(8080);