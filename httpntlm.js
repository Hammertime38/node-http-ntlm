var async = require('async');
var httpreq = require('httpreq');
var ntlm = require('./ntlm');
var agentkeepalive = require('agentkeepalive');
var httpAgent = new agentkeepalive();
var httpsAgent = new agentkeepalive.HttpsAgent();

var isUrlHTTPS = function (url) {
	return url.substring(0, 5) === 'https';
}

exports.get = function(options, callback){
	if(!options.workstation) options.workstation = '';
	if(!options.domain) options.domain = '';

	async.waterfall([
		function ($){
			var type1msg = ntlm.createType1Message(options);

			httpreq.get(options.url, {
				headers:{
					'Connection' : 'keep-alive',
					'Authorization': type1msg
				},
				agent: isUrlHTTPS(options.url) ? httpsAgent : httpAgent
			}, $);
		},

		function (res, $){
			if(!res.headers['www-authenticate'])
				return $(new Error('www-authenticate not found on response of second request'));

			var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);
			var type3msg = ntlm.createType3Message(type2msg, options);

			httpreq.get(options.url, {
				headers:{
					'Connection' : 'Close',
					'Authorization': type3msg
				},
				allowRedirects: false,
				agent: isUrlHTTPS(options.url) ? httpsAgent : httpAgent
			}, $);
		}
	], callback);
}

