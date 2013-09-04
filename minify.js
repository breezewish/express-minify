var
    fs = require('fs'),
    path = require('path'),
    uglifyjs = require('uglify-js'),
    cssmin = require('cssmin'),
    sass = require('node-sass'),
    less = require('less'),
    lessParser = new less.Parser(),
    stylus = require('stylus'),
    coffee = require('coffee-script'),
    crypto = require('crypto')
;

var
    memCache = {}
;

var
    TYPE_TEXT = 0,
    TYPE_JS = 1,
    TYPE_CSS = 2,
    TYPE_SASS = 3,
    TYPE_LESS = 4,
    TYPE_STYLUS = 5,
    TYPE_COFFEE = 6
;

function precompileError(err, type)
{
    return JSON.stringify(err);
}

function minifyIt(type, content, callback)
{
    if (typeof callback != 'function')
        return;

    switch(type)
    {
        case TYPE_JS:

            callback(uglifyjs.minify(content, {fromString: true}).code);

            break;

        case TYPE_CSS:

            callback(cssmin(content));

            break;

        case TYPE_SASS:

            sass.renderSync({
                data: content,
                success: function(css)
                {
                    callback(cssmin(css));
                },
                error: function(err)
                {
                    //TODO: Better error handling
                    callback(precompileError(err, type));
                }
            });

            break;

        case TYPE_LESS:

            lessParser.parse(content, function(err, tree)
            {
                if (err != null)
                {
                    callback(precompileError(err, type));
                    return;
                }
                
                var css = tree.toCSS();
                callback(cssmin(css));
            });

            break;

        case TYPE_STYLUS:

            stylus.render(content, function(err, css)
            {
                if (err != null)
                {
                    callback(precompileError(err, type));
                    return;
                }

                callback(cssmin(css));
            });

            break;

        case TYPE_COFFEE:

            var js = coffee.compile(content);
            callback(uglifyjs.minify(js, {fromString: true}).code);

            break;

        default:

            callback(content);

            break;
    }
}

function cacheGetFile(hash, callback)
{
    if (typeof callback != 'function')
        return;

    var filepath = this.toString();

    fs.readFile
    (
        filepath + hash,
        { encoding: 'utf8' },
        function(err, data)
        {
            if (err)
            {
                callback(err);
                return;
            }

            try
            {
                data = JSON.parse(data).content;
                callback(null, data);
            }
            catch(err)
            {
                callback(err);
            }
        }
    );
}

function cachePutFile(hash, minized, callback)
{
    var filepath = this.toString();

    // fix issue #3
    // not ended file writing will cause wrong responding.
    // using temp files can mostly avoid the case.

    fs.writeFile
    (
        filepath + hash + '.tmp',
        JSON.stringify({content:minized}),
        { encoding: 'utf8' },
        function(err)
        {
            fs.rename(filepath + hash + '.tmp', filepath + hash, function(err)
            {
                callback(err);
            });
        }
    );
}

function cacheTryFile(hash, callback)
{
    if (typeof callback != 'function')
        return;

    var filepath = this.toString();
    fs.stat(filepath + hash, callback);
}

function cacheGetMem(hash, callback)
{
    if (typeof callback != 'function')
        return;

    callback(null, memCache[hash]);
}

function cachePutMem(hash, minized, callback)
{
    memCache[hash] = minized;

    if (typeof callback == 'function')
        callback(null);
}

function cacheTryMem(hash, callback)
{
    if (typeof callback != 'function')
        return;

    callback(typeof memCache[hash] == 'undefined');
}

module.exports = function express_minify(options)
{
    options = options || {};
    
    var
        js_match = options.js_match || /javascript/,
        css_match = options.css_match || /css/,
        sass_match = options.sass_match || /scss/,
        less_match = options.less_match || /less/,
        stylus_match = options.stylus_match || /stylus/,
        coffee_match = options.coffee_match || /coffeescript/,
        whitelist = options.whitelist || null,
        blacklist = options.blacklist || [/\.min\.(css|js)$/],
        cache = options.cache || false
    ;

    var
        cache_get = cacheGetMem,
        cache_put = cachePutMem,
        cache_try = cacheTryMem
    ;

    if (cache)
    {
        cache = path.normalize(cache + '/').toString();

        fs.writeFile(cache + 'test.tmp', new Date().getTime().toString(), function(err)
        {
            if (err)
            {
                console.log('WARNING: express-minify cache directory is not valid or is not writeable.');
                return;
            }

            //Consider deleting the test file?

            //OK: rewrite functions
            cache_get = function()
            {
                return cacheGetFile.apply(cache, arguments);
            }
            cache_put = function()
            {
                return cachePutFile.apply(cache, arguments);
            }
            cache_try = function()
            {
                return cacheTryFile.apply(cache, arguments);
            }
        });
    }
    
    return function minify(req, res, next)
    {
        var
            write = res.write,
            end = res.end,
            buf = null,
            type = TYPE_TEXT,
            response_ended = false
        ;

        res.write = function(trunk, encoding)
        {
            //send header first
            if (!this.headerSent)
                this._implicitHeader();

            if (trunk == undefined)
                return;

            if (typeof trunk == 'string')
                trunk = new Buffer(trunk, encoding);

            if (buf)    //buffer the content
                buf.push(trunk);
            else
                write.call(this, trunk);
        }

        res.end = function(trunk, encoding)
        {
            if (response_ended)
                return;

            var _this = this;

            if (trunk != undefined)
                res.write.apply(_this, arguments);

            response_ended = true;

            if (buf)    //ready to minify
            {
                var buffer = Buffer.concat(buf);

                // do not minify this response
                // reaches here if res.send() occurs before res._no_minify = true
                if (res._no_minify)
                {
                    write.call(_this, buffer);
                    end.call(_this);
                    return;
                }

                var sha1 = crypto.createHash('sha1').update(buffer).digest('hex').toString();

                cache_try(sha1, function(err)
                {
                    if (err)
                    {
                        //miss
                        switch(type)
                        {
                            case TYPE_TEXT:

                                //Do nothing
                                write.call(_this, buffer);
                                end.call(_this);

                                break;

                            case TYPE_JS:
                            case TYPE_CSS:
                            case TYPE_LESS:
                            case TYPE_SASS:
                            case TYPE_STYLUS:
                            case TYPE_COFFEE:

                                minifyIt(type, buffer.toString(encoding), function(minized)
                                {
                                    cache_put(sha1, minized, function()
                                    {
                                        write.call(_this, minized, 'utf8');
                                        end.call(_this);
                                    });
                                });

                                break;
                        }
                    }
                    else
                    {
                        //hit
                        cache_get(sha1, function(err, minized)
                        {
                            if (err)
                            {
                                //cannot parse the cache
                                write.call(_this, buffer);
                                end.call(_this);
                                return;
                            }

                            write.call(_this, minized);
                            end.call(_this);
                        });
                    }
                });
            }
            else
            {
                end.call(_this);
            }
        }

        //Determine whether it should be minified
        res.on('header', function()
        {
            //do not minify this response
            if (res._no_minify)
                return;

            //test whitelist and blacklist
            if (blacklist && blacklist.constructor === Array)
            {
                // match blacklist

                for (var i = 0; i < blacklist.length; ++i)
                {
                    if (blacklist[i].test(req.url))
                        return;
                }
            }

            if (whitelist && whitelist.constructor === Array)
            {
                var matched = false;

                // match whitelist

                for (var i = 0; i < whitelist.length; ++i)
                {
                    if (whitelist[i].test(req.url))
                    {
                        matched = true;
                        break;
                    }
                }

                if (!matched)
                    return;
            }

            //test content-type
            var content_type = res.getHeader('Content-Type');

            if (js_match.test(content_type))
            {
                type = TYPE_JS;
            }
            else if (css_match.test(content_type))
            {
                type = TYPE_CSS;
            }
            else if (sass_match.test(content_type))
            {
                type = TYPE_SASS;
                res.setHeader('content-type', 'text/css');
            }
            else if (less_match.test(content_type))
            {
                type = TYPE_LESS;
                res.setHeader('content-type', 'text/css');
            }
            else if (stylus_match.test(content_type))
            {
                type = TYPE_STYLUS;
                res.setHeader('content-type', 'text/css');
            }
            else if (coffee_match.test(content_type))
            {
                type = TYPE_COFFEE;
                res.setHeader('content-type', 'text/javascript');
            }

            //not match
            if (type == TYPE_TEXT)
                return;

            res.removeHeader('content-length');
            buf = [];
        });

        next();
    }
};