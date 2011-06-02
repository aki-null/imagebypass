# Image Bypass

Image Bypass is a web service that runs on node.js to perform translation of "image service" address to the actual image address.

For example, the service will translate

`http://instagr.am/p/EInFJ/`

into

`http://images.instagram.com/media/2011/05/11/3597ce7533a640ad954caaf6afe0e60a_7.jpg`

All service details are defined in `imageServices.js`.

## Available APIs

### bypass

This API does the actual translation. The only required parameter is `url`.

Example request: `http://test.com/bypass?url=http%3A%2F%2Finstagr.am%2Fp%2FEInFJ%2F`

Example output:

	{
	   "success":true,
	   "message":"OK",
	   "imageServiceName":"Instagram",
	   "imageUrl":"http://images.instagram.com/media/2011/05/11/3597ce7533a640ad954caaf6afe0e60a_7.jpg"
	}

### supportedServices

This API returns the list of all supported image hosting services. No parameters are required. The result is sorted in alphabetical order.

Example request: `http://test.com/supportedServices`

Example output:

	{
	   "success":true,
	   "message":"OK",
	   "services":[
		  "Big Canvas PhotoShare",
		  "Flickr",
		  "ImageShack",
		  "img.ly",
		  "Instagram",
		  …
		  "はてなフォトライフ",
		  "ニコニコ動画",
		  "携帯百景"
	   ]
	}

## Modules

The current version of Image Bypass requires the following node.js modules.

* request
* querystring
* jsdom
* mysql
* hashlib
* log4js

## Initial Setup
1. Install dependant modules

		npm install request querystring jsdom mysql hashlib log4js
2. Rename `config.js.template` to `config.js`
3. Add MySQL database connection details in `config.js`
4. Obtain and add API keys to `config.js` for some image hosting services
5. Run it!

		node server.js