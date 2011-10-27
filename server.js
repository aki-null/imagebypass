/*!
 * Copyright (C) 2011 by Akihiro Noguchi
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

var imgUtils = require('./imageUtils');
var config = require('./config');
var http = require('http');
var url = require('url');
var log4js = require('log4js');

if (config.enableLogging) {
	log4js.addAppender(log4js.fileAppender('./access.log'), 'ACCESS');
}
var logger = log4js.getLogger('ACCESS');

function processRequest(req, res) {
	// Log access
	logger.info(req.connection.remoteAddress + ' - ' + req.url);

	// Rarse request URL
	var urlComps = url.parse(req.url, true);
	var pathName = urlComps.pathname;

	// Bypass API
	if (pathName == '/bypass') {
		var urlToProcess = urlComps.query.url;
		var urlRegex = /^https?:\/\//i;

		if (urlToProcess && urlRegex.test(urlToProcess)) {
			imgUtils.getImageURLFromURL(urlToProcess,
			function(finalUrl, serviceName) {
				// Success
				res.end(JSON.stringify({
					success: true,
					message: 'OK',
					imageServiceName: serviceName,
					imageUrl: finalUrl
				}));
			},
			function(error) {
				if (!error) {
					error = 'Failed to fetch the image location';
				}
				// Failure
				res.end(JSON.stringify({
					success: false,
					message: error,
					imageServiceName: null,
					imageUrl: null
				}));
			});
		} else {
			// Error (invalid parameter)
			res.end(JSON.stringify({
				success: false,
				message: 'Please specify the image URL',
				imageServiceName: null,
				imageUrl: null
			}));
		}
	} else if (pathName == '/supportedServices') {
		res.end(JSON.stringify({
			success: true,
			message: 'OK',
			services: imgUtils.getSupportedServices()
		}));
	} else {
		// Error (no such API)
		res.end(JSON.stringify({
			success: false,
			message: 'Invalid API name',
			imageServiceName: null,
			imageUrl: null
		}));
	}
}

http.createServer(processRequest).listen(config.serverPort);

console.log('Server running at port ' + config.serverPort);
