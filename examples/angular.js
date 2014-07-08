var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(function(req, res, next)
{
    // do not mangle angular JavaScript files
    if (/-angular\.js$/.test(req.url)) {
        res._no_mangle = true;
    }
    next();
});

app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);