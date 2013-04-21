var
	fs = require('fs'),
	path = require('path'),
	uglifyjs = require('uglify-js'),
	uglifycss = require('uglifycss'),
	sass = require('node-sass'),
	less = require('less'),
	lessParser = new less.Parser(),
	stylus = require('stylus'),
	coffee = require('coffee-script'),
	crypto = require('crypto')
;

var
	minified_hash = {},
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

			callback(uglifycss.processString(content, uglifycss.defaultOptions));

			break;

		case TYPE_SASS:

			sass.render(content, function(err, css)
			{
				if (err != null)
				{
					//TODO: Better error handling
					callback(precompileError(err, type));
					return;
				}

				callback(uglifycss.processString(css, uglifycss.defaultOptions));
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
				callback(uglifycss.processString(css, uglifycss.defaultOptions));
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

				callback(uglifycss.processString(css, uglifycss.defaultOptions));
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
			
			callback(null, data);
		}
	);
}

function cachePutFile(hash, minized, callback)
{
	var filepath = this.toString();

	fs.writeFile
	(
		filepath + hash,
		minized,
		{ encoding: 'utf8' },
		function(err)
		{
			callback(err);
		}
	);
}

function cacheTryFile(hash, callback)
{
	if (typeof callback != 'function')
		return;

	if (minified_hash[hash] !== undefined)
	{
		callback(false);
		return;
	}

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

	callback(!minified_hash[hash]);
}

module.exports = function express_minify(options)
{
	options = options || {};
	
	var
		js_match = options.js_match || /json|javascript/,
		css_match = options.css_match || /css/,
		sass_match = options.sass_match || /(sass|scss)/,
		less_match = options.less_match || /less/,
		stylus_match = options.stylus_match || /stylus/,
		coffee_match = options.coffee_match || /coffeescript/,
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
			type = TYPE_TEXT
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

			if (buf)	//buffer the content
				buf.push(trunk);
			else
				write.call(this, trunk);
		}

		res.end = function(trunk, encoding)
		{
			var _this = this;

			if (trunk != undefined)
				res.write.apply(_this, arguments);

			if (buf)	//ready to minify
			{
				var buffer = Buffer.concat(buf);
				var md5 = crypto.createHash('md5').update(buffer).digest('hex').toString();
				
				cache_try(md5, function(err)
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
									cache_put(md5, minized, function()
									{
										minified_hash[md5] = true;

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
						cache_get(md5, function(err, minized)
						{
							if (err)
							{
								raise(err);
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