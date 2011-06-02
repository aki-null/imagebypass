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

var imgSrv = require('./imageServices');
var config = require('./config.js');
var request = require('request');
var hashlib = require('hashlib');
var log4js = require('log4js')();
var Client = require('mysql').Client;

var urlRegex = /^https?:\/\//i;
var logger = log4js.getLogger('error');
if (config.enableLogging) {
	log4js.addAppender(log4js.fileAppender('./error.log'), 'ERROR');
}

// Connect to the database
var con = new Client();
con.host = config.dbHost;
con.port = config.dbPort;
con.user = config.dbUser;
con.password = config.dbPass;
con.connect();

// Initialize database
con.query('CREATE DATABASE ' + config.dbName, function (error) {
	if (error && error.number != Client.ERROR_DB_CREATE_EXISTS) {
		logger.error('Failed to create the database - ' + error);
	} else {
		con.query('USE ' + config.dbName, function (error) {
			if (error) {
				logger.error('Failed to select the database - ' + error);
			} else {
				con.query('CREATE TABLE IF NOT EXISTS requestCaches(pageLocation VARCHAR(32) PRIMARY KEY, imageLocation VARCHAR(512), INDEX (pageLocation));',
				function (error) {
					if (error) {
						logger.error('Failed to create the cache table - ' + error);
					}
				});
				con.query('CREATE TABLE IF NOT EXISTS blacklist(pageLocation VARCHAR(32) PRIMARY KEY, createdAt INTEGER, INDEX (pageLocation));',
				function (error) {
					if (error) {
						logger.error('Failed to create the blacklist table - ' + error);
					}
				});
			}
		});
	}
});

// Check for expired blacklist entries every 15 minutes.
setInterval(updateBlacklist, 15 * 60 * 1000);

String.prototype.format = function() {
	var args = arguments;
	return this.replace(/{(\d+)}/g,
	function(match, number) {
		return typeof args[number] != 'undefined' ? args[number] : '{' + number + '}';
	});
};

// Clear expired blacklist entries.
function updateBlacklist() {
	var expiryTime = parseInt((new Date).getTime() / 1000) - config.blacklistLength;
	con.query('DELETE FROM blacklist WHERE createdAt<?', [ expiryTime ], function (error, results, fields) {
		if (error) {
			logger.error('Failed to clear expired blacklist entries - ' + error);
		}
	});
}

// Add new blacklist entry.
function addBlacklist(url) {
	var urlHash = hashlib.md5(url);
	var currentTime = parseInt((new Date).getTime() / 1000);
	con.query('INSERT INTO blacklist (pageLocation, createdAt) VALUES(?, ?)', [ urlHash, currentTime ],
	function (error, results, fields) {
		if (error && error.number != Client.ERROR_DUP_ENTRY) {
			logger.error(url + ' - Failed to insert new blacklist entry - ' + error);
		}
	});
}

// Check for blacklist status. Callback function should take one boolean
// parameter.
function checkBlacklist(url, callback) {
	var urlHash = hashlib.md5(url);
	con.query('SELECT * FROM blacklist WHERE pageLocation=?', [ urlHash ],
	function (error, results, fields) {
		if (error) {
			callback(false);
			logger.error(url + ' - Failed to load cached result - ' + error);
		} else {
			if (results.length) {
				callback(true);
			} else {
				callback(false);
			}
		}
	});
}

// Get the cached result from the cache database.
function getCachedResult(url, callback) {
	var urlHash = hashlib.md5(url);
	con.query('SELECT * FROM requestCaches WHERE pageLocation=?', [ urlHash ], function (error, results, fields) {
		if (error) {
			logger.error(url + ' - Failed to load cached result - ' + error);
			callback(null);
		} else if (results.length) {
			// Found cached result
			var cachedRow = results[0];
			callback(cachedRow.imageLocation);
		} else {
			// Not cached
			callback(null);
		}
	});
}

// Cache the translation result into the cache database.
function cacheResult(url, result) {
	var urlHash = hashlib.md5(url);
	con.query('INSERT INTO requestCaches (pageLocation, imageLocation) VALUES(?, ?)', [ urlHash, result ],
	function (error, results, fields) {
		if (error && error.number != Client.ERROR_DUP_ENTRY) {
			logger.error(url + ' - Failed to save cached result - ' + error);
		}
	});
}

// Simply substitute the first capture group into　the rule string.
function performSingleReplace(url, rule, successFn, failureFn) {
	var result = null;
	if (url && rule) {
		url.match(rule.regex);
		var imgId = RegExp.$1;
		if (imgId) {
			result = rule.ruleString.format(imgId);
		}
	}
	if (result && urlRegex.test(result)) {
		successFn(result, rule.name);
	} else {
		failureFn();
	}
}

// Simply substitute first two capture groups into　the rule string.
function performDoubleReplace(url, rule, successFn, failureFn) {
	var result = null;
	if (url && rule) {
		url.match(rule.regex);
		var imgId = RegExp.$1;
		var imgId2 = RegExp.$2;
		if (imgId && imgId2) {
			result = rule.ruleString.format(imgId, imgId2);
		}
	}
	if (result && urlRegex.test(result)) {
		successFn(result, rule.name);
	} else {
		failureFn();
	}
}

// Fetch the page specified in image service definition and use regex
// to fetch the actual URL.
function performRegexCapture(url, rule, successFn, failureFn) {
	var failed = true;
	if (url && rule) {
		checkBlacklist(url, function (isListed) {
			if (isListed) {
				failureFn();
			} else {
				// Get the cached result
				getCachedResult(url, function(cachedResult) {
					if (cachedResult) {
						successFn(cachedResult, rule.name);
					} else {
						url.match(rule.regex);
						var imgId = RegExp.$1;
						if (imgId) {
							var resourceUrl = rule.ruleString.format(imgId);
							request({ uri: resourceUrl }, function(error, response, body) {
								var result = null;
								if (!error && response.statusCode == 200) {
									body.match(rule.responseRegex);
									var result = RegExp.$1;
								}
								if (result && urlRegex.test(result)) {
									cacheResult(url, result);
									successFn(result, rule.name);
								} else {
									failureFn();
									addBlacklist(url);
									if (error) {
										logger.error(url + ' - Failed to load the target page - ' + error);
									} else {
										logger.error(url + ' - Failed to find the image location');
									}
								}
							});
						} else {
							failureFn();
						}
					}
				});
			}
		});
	} else {
		failureFn();
	}
}

// Capturing result from JSON data. The annonymous function in image
// service definition is responsible for returning the value.
function performJSONCapture(url, rule, successFn, failureFn) {
	if (url && rule) {
		checkBlacklist(url, function (isListed) {
			if (isListed) {
				failureFn();
			} else {
				getCachedResult(url, function(cachedResult) {
					if (cachedResult) {
						successFn(cachedResult, rule.name);
					} else {
						url.match(rule.regex);
						var imgId = RegExp.$1;
						if (imgId) {
							var resourceUrl = rule.ruleString.format(imgId);
							request({
								uri: resourceUrl
							},
							function(error, response, body) {
								var result = null;
								if (!error && response.statusCode == 200) {
									var data = null;
									try {
										data = JSON.parse(body);
									} catch (e) {
										logger.error(url + ' - Failed to parse JSON data - ' + e);
									}
									if (data) {
										result = rule.getResult(data);
									}
								}
								if (result && urlRegex.test(result)) {
									cacheResult(url, result);
									successFn(result, rule.name);
								} else {
									failureFn();
									addBlacklist(url);
									if (error) {
										logger.error(url + ' - Failed to load JSON data - ' + error);
									} else {
										logger.error(url + ' - Failed to find the image location in JSON data');
									}
								}
							});
						} else {
							failureFn();
						}
					}
				});
			}
		});
	} else {
		failureFn();
	}
}

// Web page scraping with DOM. The annonymous function in image
// service definition is responsible for accessing the value.
// The anonymous function may use jQuery.
function performDOMQuery(url, rule, successFn, failureFn) {
	if (url && rule) {
		checkBlacklist(url, function (isListed) {
			if (isListed) {
				failureFn();
			} else {
				// Get the cached result
				var cachedResult = getCachedResult(url,
				function(cachedResult) {
					if (cachedResult) {
						// Found the result in cache
						successFn(cachedResult, rule.name);
					} else {
						// The result is not in the cache
						request({
							uri: url
						},
						function(error, response, body) {
							// Requested web page is downloaded
							if (!error && response.statusCode == 200) {
								var jsdom = require('jsdom');
								jsdom.env(body, ['jquery-1.6.1.min.js'],
								function(errors, window) {
									var result = null;
									if (!errors || errors.length == 0) {
										var result = rule.getResult(window);
									}
									if (result && urlRegex.test(result)) {
										cacheResult(url, result);
										successFn(result, rule.name);
									} else {
										failureFn();
										addBlacklist(url);
										if (errors) {
											logger.error(url + ' - Failed to load DOM - ' + errors);
										} else {
											logger.error(url + ' - Failed to analyze the web page page');
										}
									}
								});
							} else {
								failureFn();
								addBlacklist(url);
								logger.error(url + ' - Failed to load the target web page - ' + error);
							}
						});
					}
				});
			}
		});
	} else {
		failureFn();
	}
}

// Returns the names of all supported image services.
exports.getSupportedServices = function() {
	return imgSrv.supportedServices;
}

// Translate the image service URL into the actual image address.
exports.getImageURLFromURL = function(url, successFn, failureFn) {
	// Find the matching service and get the image URL
	for (var i = 0; i < imgSrv.imageServices.length; i++) {
		var service = imgSrv.imageServices[i];
		if (url.match(service.regex)) {
			var result = null;
			switch (service.method) {
			case imgSrv.fetchMethod.singleReplace:
				performSingleReplace(url, service, successFn, failureFn);
				return;
			case imgSrv.fetchMethod.responseCaptureRegex:
				performRegexCapture(url, service, successFn, failureFn);
				return;
			case imgSrv.fetchMethod.doubleReplace:
				performDoubleReplace(url, service, successFn, failureFn);
				return;
			case imgSrv.fetchMethod.responseCaptureJSON:
				performJSONCapture(url, service, successFn, failureFn);
				return;
			case imgSrv.fetchMethod.responseDOMQuery:
				performDOMQuery(url, service, successFn, failureFn);
				return;
			default:
				break;
			}
		}
	}
	failureFn('Invalid image service URL specified');
}
