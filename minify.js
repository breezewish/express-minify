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

function minifyIt(type, options, content, callback)
{
    if (typeof callback != 'function')
        return;

    switch(type)
    {
        case TYPE_JS:
            var opt = {fromString: true};
            if (options.no_mangle) {
                opt.mangle = false;
            }
            callback(uglifyjs.minify(content, opt).code);
            break;
        case TYPE_CSS:
            callback(cssmin(content));
            break;
        case TYPE_SASS:
            sass.renderSync({
                data: content,
                success: function(css) {
                    callback(cssmin(css));
                },
                error: function(err) {
                    //TODO: Better error handling
                    callback(precompileError(err, type));
                }
            });
            break;
        case TYPE_LESS:
            lessParser.parse(content, function(err, tree) {
                if (err) {
                    callback(precompileError(err, type));
                    return;
                }
                var css = tree.toCSS();
                callback(cssmin(css));
            });
            break;
        case TYPE_STYLUS:
            stylus.render(content, function(err, css) {
                if (err) {
                    callback(precompileError(err, type));
                    return;
                }
                callback(cssmin(css));
            });
            break;
        case TYPE_COFFEE:
            var js = coffee.compile(content);
            var opt = {fromString: true};
            if (options.no_mangle) {
                opt.mangle = false;
            }
            callback(uglifyjs.minify(js, opt).code);
            break;
        default:
            callback(content);
            break;
    }
}

function cacheGetFile(hash, callback)
{
    if (typeof callback != 'function') {
        return;
    }

    var filepath = this.toString();

    fs.readFile(filepath + hash, { encoding: 'utf8' }, function(err, data) {
        if (err) {
            callback(err);
            return;
        }
        try {
            data = JSON.parse(data).content;
            callback(null, data);
        } catch(err) {
            callback(err);
        }
    });
}

function cachePutFile(hash, minized, callback)
{
    var filepath = this.toString();

    // fix issue #3
    // not ended file writing will cause wrong responding.
    // using temp files can mostly avoid the case.

    fs.writeFile(filepath + hash + '.tmp', JSON.stringify({content:minized}), { encoding: 'utf8' }, function(err) {
        if (err) {
            return callback(err);
        }
        fs.rename(filepath + hash + '.tmp', filepath + hash, callback);
    });
}

function cacheGetMem(hash, callback)
{
    if (typeof callback != 'function') {
        return;
    }

    if (typeof memCache[hash] == 'undefined') {
        callback(new Error('miss'));
    } else {
        callback(null, memCache[hash]);
    }
}

function cachePutMem(hash, minized, callback)
{
    memCache[hash] = minized;

    if (typeof callback == 'function') {
        callback(null);
    }
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
        cache = options.cache || false
    ;

    var
        cache_get = cacheGetMem,
        cache_put = cachePutMem
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
            cache_get = function() {
                return cacheGetFile.apply(cache, arguments);
            };
            cache_put = function() {
                return cachePutFile.apply(cache, arguments);
            };
        });
    }
    
    return function minify(req, res, next)
    {
        var _storeHeader = res._storeHeader;

        var write = res.write;
        var end = res.end;

        var buf = null;
        var type = TYPE_TEXT;

        res._storeHeader = function(statusLine, headers)
        {
            if (this._no_minify) {
                return _storeHeader.apply(this, arguments);
            }

            var contentType = null;
            var contentTypeKey = null;

            for (var header in headers) {
                if (header.toLowerCase() === 'content-type') {
                    contentTypeKey = header;
                    contentType = headers[header];
                    break;
                }
            }

            // there are no header called 'content-type'
            if (!contentType) {
                return _storeHeader.apply(this, arguments);
            }

            if (js_match.test(contentType)) {
                type = TYPE_JS;
            } else if (css_match.test(contentType)) {
                type = TYPE_CSS;
            } else if (sass_match.test(contentType)) {
                type = TYPE_SASS;
                headers[contentTypeKey] = 'text/css';
            } else if (less_match.test(contentType)) {
                type = TYPE_LESS;
                headers[contentTypeKey] = 'text/css';
            } else if (stylus_match.test(contentType)) {
                type = TYPE_STYLUS;
                headers[contentTypeKey] = 'text/css';
            } else if (coffee_match.test(contentType)) {
                type = TYPE_COFFEE;
                headers[contentTypeKey] = 'text/javascript';
            }

            if (type !== TYPE_TEXT) {
                // delete content-length
                for (var header in headers) {
                    if (header.toLowerCase() === 'content-length') {
                        delete headers[header];
                        break;
                    }
                }

                // prepare the buffer
                buf = [];
            }

            return _storeHeader.apply(this, arguments);
        }

        res.write = function(chunk, encoding) {
            if (!this._header) {
                this._implicitHeader();
            }

            if (buf === null || this._no_minify) {
                return write.apply(this, arguments);
            }

            if (!this._hasBody) {
                return true;
            }

            if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) {
                throw new TypeError('first argument must be a string or Buffer');
            }

            if (chunk.length === 0) return true;

            // no chunked_encoding here
            if (typeof chunk == 'string') {
                chunk = new Buffer(chunk, encoding);
            }
            
            buf.push(chunk);
        }

        res.end = function(data, encoding)
        {
            if (this.finished) {
                return false;
            }

            if (!this._header) {
                this._implicitHeader();
            }

            if (data && !this._hasBody) {
                data = false;
            }

            if (buf === null || this._no_minify) {
                return end.apply(this, arguments);
            }

            // TODO: implement hot-path optimization
            if (data) {
                this.write(data, encoding);
            }

            var buffer = Buffer.concat(buf);
            var sha1 = crypto.createHash('sha1').update(buffer).digest('hex').toString();
            var _this = this;

            cache_get(sha1, function(err, minized) {
                if (err) {
                    switch(type) {
                        case TYPE_TEXT:
                            // impossible to reach here
                            throw new Error('[express-minify] impossible to reach here. Please report the bug.');
                            break;
                        default:
                            // cache miss
                            minifyIt(type, { no_mangle: _this._no_mangle }, buffer.toString(encoding), function(minized) {
                                if (_this._no_cache) {
                                    // do not save cache for this response
                                    end.call(_this, minized, 'utf8');
                                } else {
                                    cache_put(sha1, minized, function() {
                                        end.call(_this, minized, 'utf8');
                                    });
                                }
                            });
                            break;
                    }
                } else {
                    end.call(_this, minized, 'utf8');
                }
            });
        }

        next();
    }
};