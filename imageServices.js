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

exports.fetchMethod = {
	singleReplace: 0,
	doubleReplace: 1,
	responseCaptureRegex: 2,
	responseCaptureJSON: 3,
	responseDOMQuery: 4,
};

function processPicplzData(data) {
	var images = data.value.pics[0].pic_files;
	if (images) {
		var result = images['640r'];
		if (!result) {
			result = images['320rh'];
		}
		if (!result) {
			result = images['100sh'];
		}
		if (result) {
			return result.img_url;
		}
	}
	return null;
}

var config = require('./config.js');

// Image service definitions
 exports.imageServices = [
{
	name: '携帯百景',
	regex: 'https?://(?:www.)?movapic.com/pic/([0-9]+[0-9a-f]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://image.movapic.com/pic/m_{0}.jpeg'
},
{
	name: '携帯百景',
	regex: 'https?://(?:www.)?movapic.com/([a-zA-Z0-9]+)/pic/([0-9]+)',
	method: exports.fetchMethod.responseDOMQuery,
	getResult: function(window) {
		return window.$('div.picdetail img.image').attr('src');
	}
},
{
	name: 'TwitPic',
	regex: 'https?://(?:www.)?twitpic.com/(?!photos)([0-9a-z]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://twitpic.com/show/large/{0}.jpg'
},
{
	name: 'twitgoo',
	regex: 'https?://(?:www.)?twitgoo.com/([0-9a-z]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://twitgoo.com/show/img/{0}'
},
{
	name: 'TweetPhoto',
	regex: '(https?://(?:www.)?tweetphoto.com/[0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://api.plixi.com/api/tpapi.svc/imagefromurl?size=big&url={0}'
},
{
	name: 'Plixi',
	regex: '(https?://plixi.com/p/[0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://api.plixi.com/api/tpapi.svc/imagefromurl?size=big&url={0}'
},
{
	name: 'Lozkerz',
	regex: '(https?://lockerz.com/s/[0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://api.plixi.com/api/tpapi.svc/imagefromurl?size=big&url={0}'
},
{
	name: 'Mobypicture',
	regex: 'https?://(?:www.)?moby.to/[a-zA-Z0-9]+',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://api.mobypicture.com?t={0}&s=medium&format=plain&k=' + config.mobypicture
},
{
	name: 'Big Canvas PhotoShare',
	regex: 'https?://(?:www.)?bcphotoshare.com/photos/[0-9]+/([0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://images.bcphotoshare.com/storages/{0}/large.jpg'
},
{
	name: 'img.ly',
	regex: 'https?://(?:www.)?img.ly/([a-zA-Z0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://img.ly/show/large/{0}'
},
{
	name: 'yfrog',
	regex: 'https?://(?:www.)?yfrog.com/([a-zA-Z0-9]+)',
	method: exports.fetchMethod.responseCaptureRegex,
	ruleString: 'http://yfrog.com/api/xmlInfo?path={0}',
	responseRegex: '<image_link>([^<]+)'
},
{
	name: 'ImageShack',
	regex: '(https?://(?:imageshack.us/photos?/[^/]+/[0-9]+/[^/]+/|img[0-9]*.imageshack.us/i/[^/]+/))',
	method: exports.fetchMethod.responseCaptureRegex,
	ruleString: '{0}',
	responseRegex: '<meta\\s*property="og:image"\\s*content="([^"]+)'
},
{
	name: 'TwitrPix',
	regex: 'https?://twitrpix.com/([a-zA-Z0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://img.twitrpix.com/{0}'
},
{
	name: 'Pckles',
	regex: 'https?://(?:pckles.com|pckl.es)/([A-Za-z0-9_]+)/([a-z0-9]+)',
	method: exports.fetchMethod.doubleReplace,
	ruleString: 'http://pckles.com/{0}/{1}.jpg'
},
{
	name: 'Instagram',
	regex: '(https?://instagr.am/p/[^/]+/?)',
	method: exports.fetchMethod.responseCaptureJSON,
	ruleString: 'http://api.instagram.com/oembed?url={0}',
	getResult: function(data) {
		return data.url;
	}
},
{
	name: 'はてなフォトライフ',
	regex: 'https?://f.hatena.ne.jp/[^/]+/[0-9]+',
	method: exports.fetchMethod.responseDOMQuery,
	getResult: function(window) {
		return window.$('img.foto').attr('src');
	}
},
{
	name: 'Skitch',
	regex: 'https?://(?:skitch.com|skit.ch)/.+',
	method: exports.fetchMethod.responseDOMQuery,
	getResult: function(window) {
		return window.$('#skitch-image').attr('src');
	}
},
{
	name: 'ow.ly',
	regex: 'https?://ow.ly/i/([0-9a-zA-Z]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://static.ow.ly/photos/normal/{0}.jpg'
},
{
	name: 'ついっぷるフォト',
	regex: 'https?://p.twipple.jp/([0-9a-zA-Z]{5})',
	method: exports.fetchMethod.singleReplace,
    ruleString: 'http://p.twipple.jp/show/large/{0}'
},
{
	name: 'ニコニコ動画',
	regex: 'http://www.nicovideo.jp/watch/sm([0-9]+)',
	method: exports.fetchMethod.responseCaptureRegex,
	ruleString: 'http://ext.nicovideo.jp/api/getthumbinfo/sm{0}',
	responseRegex: '<thumbnail_url>([^<]+)'
},
{
	name: 'YouTube',
	regex: 'https?://(?:youtu.be/|(?:www.youtube.com/(?:v/|embed/|watch\\?(?:.*?)v=)))([a-zA-Z0-9]+)',
	method: exports.fetchMethod.singleReplace,
	ruleString: 'http://img.youtube.com/vi/{0}/0.jpg'
},
{
	name: 'picplz',
	regex: 'https?://picplz.com/(?!user)([a-zA-Z0-9]+)/?$',
	method: exports.fetchMethod.responseCaptureJSON,
	ruleString: 'http://api.picplz.com/api/v2/pic.json?shorturl_id={0}',
	getResult: processPicplzData
},
{
	name: 'picplz',
	regex: 'https?://picplz.com/user/[^/]+/pic/([a-zA-Z0-9]+)',
	method: exports.fetchMethod.responseCaptureJSON,
	ruleString: 'http://api.picplz.com/api/v2/pic.json?longurl_id={0}',
	getResult: processPicplzData
},
{
	name: 'Flickr',
	regex: 'https?://(?:www.|m.)?flickr.com/(?:#/)?photos/[^/]+/([0-9]+)',
	method: exports.fetchMethod.responseCaptureJSON,
	ruleString: 'http://api.flickr.com/services/rest/?photo_id={0}&method=flickr.photos.getSizes&format=json&nojsoncallback=1&api_key=' + config.apiKeys.flickr,
	getResult: function(data) {
		var allPics = data.sizes.size;
		var result = null;
		for (var i = 0; i < allPics.length; i++) {
			var currentPic = allPics[i];
			if (currentPic.label == 'Medium') {
				result = currentPic.source;
			}
		}
		// Get the last image in case there is no medium sized image
		if (!result && allPics.length) {
			result = allPics[allPics.length - 1];
		}
		return result;
	}
}
];

// Compile regexex
for (var i = 0; i < exports.imageServices.length; i++) {
	var service = exports.imageServices[i];
	service.regex = new RegExp(service.regex, "i");
	if (service.responseRegex) {
		service.responseRegex = new RegExp(service.responseRegex, "i");
	}
}

exports.supportedServices = [];
for (var i = 0; i < exports.imageServices.length; i++) {
	var service = exports.imageServices[i];
	if (exports.supportedServices.indexOf(service.name) == -1) {
		exports.supportedServices.push(service.name);
	}
}
exports.supportedServices.sort(function(x, y) {
	var a = String(x).toUpperCase();
	var b = String(y).toUpperCase();
	if (a > b) {
		return 1;
	} else if (a < b) {
		return - 1;
	}
	return 0;
});
