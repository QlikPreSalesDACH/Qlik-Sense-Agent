var config = require('./config/config');
var path = require("path");
var extend = require("extend");
var express = require('express');
var fs = require('fs');
var qrsInteract = require('qrs-interact');
var router = express.Router();
const qsocks = require('qsocks');
var request = require('request');
var socketHelper = require("./lib/socketHelper");

socketHelper.createConnection('https://localhost' + ':' + config.app.port);

router.use(function (req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
router.route("/user")
	.get(function(req, res){
		res.send(req.userId)
	})

router.route("/ui")
	.get(function (request, response) {
		var options = {
			root: config.app.appPath
		};	
		response.sendFile('index.html', options, function (err) {
			if (err) {
				console.log("error");
				response.status(err.status).end();
			}
		});
	})

router.route("/version")
	.get(function (req, res) {
		res.send(config.app.version);
	})

router.route("/createApp")
	.post(function (req, res) {
		var user = req.body.user;
		var sourceapp = req.body.app;
		var cpvalue = req.body.cp;
		console.log(user);
		console.log(sourceapp);
		const client = fs.readFileSync('certs/' + config.sandbox.hostname + '/client.pem');
		const client_key = fs.readFileSync('certs/' + config.sandbox.hostname + '/client_key.pem');
		const target = {
			host: config.sandbox.hostname,
			port: 4747,
			isSecure: true,
			headers: {
				'X-Qlik-User': 'UserDirectory=' + user.userdirectory + ';UserId=' + user.userid
			},
			key: client_key,
			cert: client,
			rejectUnauthorized: false,
			prefix: config.sandbox.prefix
		};

		var vNamespace = sourceapp.name + '_' + user.userid;
		var vApp;
		vApp = vNamespace + '_' + timeStamp();
		var vAppID;

		socketHelper.sendMessageRoom('qsa', { percent: 1, msg: 'connecting to server' }, user.userid);
		qsocks.Connect(target).then(global => {
			console.log('createApp');
			socketHelper.sendMessageRoom('qsa', { percent: 10, msg: 'app gets created' }, user.userid);
			return global.createApp(vApp)
				.then((reply) => {
					vAppID = reply.qAppId;
					console.log('New AppID: ' + vAppID);
					socketHelper.sendMessageRoom('qsa', { percent: 15, msg: 'new app created with ID ' + vAppID }, user.userid);
					return global.openDoc(reply.qAppId)
				})
				.then(app => {

					return app.getEmptyScript('Main')

						.then((script) => {
							var myscript = "///$tab Binary\r\n Binary [lib://" + config.sandbox.dataconnection + "/" + sourceapp.id + "];";
							console.log('setScript');
							socketHelper.sendMessageRoom('qsa', { percent: 30, msg: 'loadscript gets injected' }, user.userid);
							return app.setScript(myscript + script)

						})
						.then(() => {
							console.log('doReload');
							socketHelper.sendMessageRoom('qsa', { percent: 40, msg: 'app gets reloaded... this could take a few minutes' }, user.userid);
							return app.doReload();
						})
						.then(() => {
							console.log('doSave');
							socketHelper.sendMessageRoom('qsa', { percent: 80, msg: 'saving created app' }, user.userid);
							return app.doSave();
						})
						.then(function () {
							if (cpvalue != 0 && config.gms.usegms == true) {
								console.log('setCP');
								socketHelper.sendMessageRoom('qsa', { percent: 90, msg: 'detected metrics definition' }, user.userid);
								return setCP(vAppID, config.gms.cpid, cpvalue, config.sandbox.hostname);
							} else {
								console.log("No CP");
								socketHelper.sendMessageRoom('qsa', { percent: 90, msg: 'no metrics definition detected' }, user.userid);
								return;
							};
						})
						.then(function () {
							if (cpvalue != 0 && config.gms.usegms == true) {
								socketHelper.sendMessageRoom('qsa', { percent: 95, msg: 'inject metrics definition' }, user.userid);
								console.log('callGMS');
								var options = {
									url: 'https://' + config.sandbox.hostname + ':' + config.gms.port + '/masterlib/update/all',
									method: 'POST',
									cert: fs.readFileSync(path.join(__dirname, "certs/" + config.sandbox.hostname + "/client.pem")),
									key: fs.readFileSync(path.join(__dirname, "certs/" + config.sandbox.hostname + "/client_key.pem")),
									rejectUnauthorized: false
								}

								request(options, function (error, response, body) {
									if (!error && response.statusCode == 200) {
										console.log(body)
										return
									} else {
										console.log(error);
										return
									}
								})
							} else {
								socketHelper.sendMessageRoom('qsa', { percent: 95, msg: 'no metrics definition detected' }, user.userid);
								console.log("No GMS");
								return;
							};
						})
				})
				.then(() => {
					return global.connection.close();
				})
				.catch(err => {
					console.log(err)
				})

		})
			.then(() => {
				var vHUBURL = (config.sandbox.isSecure ? "https://" : "http://") + config.sandbox.hostname + (config.sandbox.port ? ":" + config.sandbox.port : "") + config.sandbox.prefix + 'sense/app/' + vAppID + "/";
				socketHelper.sendMessageRoom('qsa', { percent: 100, msg: 'app has been deployed successfully' }, user.userid);
				socketHelper.sendMessageRoom('qsa', { percent: 101, msg: vHUBURL }, user.userid);
			})
	
			res.status(200).send("I'm building stuff");
		})

module.exports = router;

function buildModDate() {
	var d = new Date();
	return d.toISOString();
}

function timeStamp() {
	var now = new Date();
	var date = [now.getMonth() + 1, now.getDate(), now.getFullYear()];
	var time = [now.getHours(), now.getMinutes(), now.getSeconds()];
	var suffix = (time[0] < 12) ? "AM" : "PM";
	time[0] = time[0] || 12;
	for (var i = 1; i < 3; i++) {
		if (time[i] < 10) {
			time[i] = "0" + time[i];
		}
	}
	var tmp = date.join() + "_" + time.join();
	return tmp.replace(/,/g, "");
}

function setCP(appId, customPropId, customPropValue, host) {
	return new Promise(function (resolve, reject) {
		if (customPropValue == undefined) {
			console.log("No Custom Property Selected")
		} else {

			var qrsInstance = {
				hostname: host,
				localCertPath: path.join(__dirname, "certs/" + host)
			};

			var qrs = new qrsInteract(qrsInstance);

			var jsonBody = {
				"items": [{
					"type": "App",
					"objectID": appId
				}]
			};

			qrs.Post('/selection', jsonBody, 'json').then(function (result) {
				console.log(result.body.id);

				var jsonBody = {
					"latestModifiedDate": buildModDate(),
					"type": "App",
					"properties": [{
						"name": "@" + customPropId,
						"value": {
							"added": [customPropValue],
							"removed": []
						},
						"valueIsModified": "true"
					}]
				};
				return qrs.Put("/selection/" + result.body.id + "/app/synthetic", jsonBody).then(function (result) {
					resolve('CP added!')
				});
			}).catch(function (error) {
				console.log(error)
				reject(error)
			})

		}
	})
}