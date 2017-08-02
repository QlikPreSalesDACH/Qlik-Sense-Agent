var path = require("path");
var extend = require("extend");
var fs = require("fs");

var installConfig;
var baseConfigPath = path.join(__dirname, "/../config/");
var dir = fs.readdirSync(baseConfigPath);
dir.forEach(function (file) {
    if (file === 'installConfig.json') {
        installConfig = JSON.parse(fs.readFileSync(path.join(baseConfigPath, file)));
    }
})

var certPath = path.join(process.env.programdata, "/Qlik/Sense/Repository/exported certificates/.local certificates");
var logPath = path.join(__dirname, "../log");

var config = {
    certificates: {
        certPath: certPath,
        client: path.resolve(certPath, 'client.pem'),
        client_key: path.resolve(certPath, 'client_key.pem'),
        server: path.resolve(certPath, 'server.pem'),
        server_key: path.resolve(certPath, 'server_key.pem'),
        root: path.resolve(certPath, 'root.pem')
    },
    app: {
        version: "1.0.0",
        devMode: false,
        hostname: "localhost",
        port: 8589,
        publicPath: path.join(__dirname, "../public"),
        appPath: path.join(__dirname, "../app"),
        nodePath: path.join(__dirname, "../node_modules")
    },
    engine: {
        port: 4747,
        hostname: "localhost",
        userDirectory: 'INTERNAL',
        userId: 'sa_api'
    },
    qrs: {
        localCertPath: certPath,
        hostname: "localhost",
        repoAccountUserDirectory: 'INTERNAL',
        repoAccountUserId: 'sa_api'
    },
	sandbox: {
		hostname: "Please insert your hostname",
		isSecure: true,
		port: "443",
		prefix: "/",
        url: "https://<Please insert your hostname>/sense/app/",
        dataconnection: "Please insert Connection Name"		
	},
	gms: {
		usegms: true,
		cpid: "Please insert CustomPropertyID e.g. ca5fba62-e182-46bc-928b-41fa5e497648",
		port: 8590
	}
};

module.exports = config;