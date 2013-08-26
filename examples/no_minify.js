var minify = require('express-minify');
var express = require('express');
var app = express();

app.use(minify());
app.get('/get_server_time.js', function(req, res)
{
    res._no_minify = true;
    res.setHeader('Content-Type', 'application/javascript');
    res.end("MyLib.remoteCall(" + JSON.stringify({
        'id': '1',
        'data': {
            'timestamp': new Date().getTime()
        }
    }, null, 4) + ");");
});

app.listen(8080);