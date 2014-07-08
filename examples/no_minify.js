var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(function(req, res, next)
{
    // for all *.min.css or *.min.js, do not minify it
    if (/\.min\.(css|js)$/.test(req.url)) {
        res._no_minify = true;
    }
    next();
});

app.use(minify());

app.get('/server_time_min.jsonp', function(req, res)
{
    var obj = {
        'ok': true,
        'data': {
            'timestamp': new Date().getTime()
        }
    };

    // minify this response, but do not cache it
    res._no_cache = true;
    res.setHeader('Content-Type', 'application/javascript');
    res.send("callback(" + JSON.stringify(obj, null, 4) + ");");
});

app.get('/server_time.jsonp', function(req, res)
{
    var obj = {
        'ok': true,
        'data': {
            'timestamp': new Date().getTime()
        }
    };

    // do not minify this response
    res._no_minify = true;
    res.setHeader('Content-Type', 'application/javascript');
    res.send("callback(" + JSON.stringify(obj, null, 4) + ");");
});

app.use(express.static(__dirname + '/static'));

app.listen(8080);