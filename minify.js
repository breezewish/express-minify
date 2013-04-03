var
	fs = require('fs'),
	path = require('path'),
	uglifyjs = require('uglify-js'),
	uglifycss = require('uglifycss'),
	parse = require('url').parse
;

function parseUrl(req)
{
	var parsed = req._parsedUrl;
	
	if (parsed && parsed.href == req.url)
		return parsed;
	else
		return req._parsedUrl = parse(req.url);
}

function getExtension(filename)
{
    var i = filename.lastIndexOf('.');
    return (i < 0) ? '' : filename.substr(i);
}

function deserializeCache(filepath, callback)
{
	if (typeof callback !== 'function')
		return;
	
	fs.readFile
	(
		filepath,
		{ encoding: 'utf8' },
		function(_err, data)
		{
			var obj = {};
			
			//file not exists, etc.
			if (_err)
				return callback(_err, obj);
			
			try
			{
				obj = JSON.parse(data);
			}
			catch(err)
			{
				//JSON parsing failed
				_err = err;
			}
			
			return callback(_err, obj);
		}
	);
	
	return true;
}

function serializeCache(filepath, object)
{
	fs.writeFile
	(
		filepath,
		JSON.stringify(object),
		{ encoding: 'utf8' }
	);
}

function minifyJS(filename)
{
	//TODO: Async
	return uglifyjs.minify(fs.readFileSync(filename, 'utf8'), {fromString: true}).code;
}

function minifyCSS(filename)
{
	//TODO: Async
	return uglifycss.processString(fs.readFileSync(filename, 'utf8'), uglifycss.defaultOptions);
}

exports = module.exports = function minify(dirPath, options)
{
	options = options || {};
	
	if (!dirPath)
	{
		throw new Error('You need to provide the directory to your static content.');
		return null;
	}
	
	var
		suffix = options.suffix || 'minify',
		match = options.match || '\\.(js|css)$',
		cacheFile = options.cacheFile || null
	;
	
	var
		matchReg = new RegExp(match, 'i'),
		ignoreReg = new RegExp('\\.' + suffix + match, 'i')
	;
	
	//storing last-modified data
	var cache = {};
	
	dirPath = path.normalize(dirPath);
	
	if (cacheFile !== null)
	{
		deserializeCache(cacheFile, function(err, data)
		{
			if (err)
				return;
			
			cache = data;
		});
	}
	
	return function minify_middleware(req, res, next)
	{
		var url = decodeURI(parseUrl(req).pathname);

		if (!url.match(matchReg) || url.match(ignoreReg))
			return next();
		
		var filename = path.normalize(path.join(dirPath, url));
		
		fs.stat(filename, function(err, stat)
		{
			if (err || stat.isDirectory())
				return next();
			
			var extension = getExtension(filename);
			
			//file not modified
			if (cache[filename] !== undefined && stat.mtime.getTime() === cache[filename])
			{
				req.url = req.url + '.' + suffix + extension;
				return next();
			}
			
			//ready to minify
			try
			{
				switch(extension.toLowerCase())
				{
					case '.css':
						var minized = minifyCSS(filename);
						break;
					case '.js':
						var minized = minifyJS(filename);
						break;
					default:
						return next();
						break;
				}
				
				fs.writeFile
				(
					filename + '.' + suffix + extension,
					minized,
					{ encoding: 'utf8' },
					function(err)
					{
						if (err)
							return next();
						
						//update cache
						cache[filename] = stat.mtime.getTime();
						
						if (cacheFile !== null)
							serializeCache(cacheFile, cache);
						
						//successfully created the minized file
						req.url = req.url + '.' + suffix + extension;
						return next();
					}
				);
			}
			catch(e)
			{
				return next();
			}
			
			return;
		});
	};
};