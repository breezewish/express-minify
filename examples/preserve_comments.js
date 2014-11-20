var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(function(req, res, next)
{
    if (/\.(user|meta)\.js$/.test(req.url)) {
        res._uglifyOutput = {
            comments: true
        };
    }
    next();
});

app.use(minify());
app.use(express.static(__dirname + '/static'));

app.listen(8080);