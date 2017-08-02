//require statements
var express = require('express');
var config = require('./config/config');
var fs = require('fs');
var path = require('path');
var https = require('https');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var socketio = require('socket.io');

var app = express();

app.use(cookieParser());
app.use(bodyParser.json()); // for parsing application/json

if (!config.app.devMode) {
    var rewrite = require("./middleware/rewrite");
    var auth = require('./middleware/auth');
    var vpList = require('./middleware/vpList');
    app.use(vpList());
    app.use(rewrite());
    app.use(auth());
}

app.use("/qsa/public", express.static(config.app.publicPath));
app.use("/qsa/app", express.static(config.app.appPath));
app.use("/qsa/node_modules", express.static(config.app.nodePath));
app.use("/*/qsa/public", express.static(config.app.publicPath));
app.use("/*/qsa/app", express.static(config.app.appPath));
app.use("/*/qsa/node_modules", express.static(config.app.nodePath));

app.get('/test', function(req, res, next) {
  res.json({ message: 'Hello World' });
});


var port = config.app.port || 8589;

var routes = require("./routes");



app.use("/*/qsa", routes);
app.use("/qsa", routes);

var httpsOptions = {}

if (config.hasOwnProperty("certificates")) {
    if (config.certificates.server !== undefined) {
        //pem files in use
        httpsOptions.cert = fs.readFileSync(config.certificates.server);
        httpsOptions.key = fs.readFileSync(config.certificates.server_key);
    }

    if (config.certificates.pfx !== undefined) {
        httpsOptions.pfx = fs.readFileSync(config.certificates.pfx);
        httpsOptions.passphrase = config.certificates.passphrase;
    }
} else {
    httpsOptions.cert = fs.readFileSync(config.certificates.server),
        httpsOptions.key = fs.readFileSync(config.certificates.server_key)
}

var server = https.createServer(httpsOptions, app);
server.listen(port, function () {
    console.log("Server running on port: " + port);
});

var io = new socketio(server);

// io.on('connection', function (socket) {
//     socket.on("qsa", function (msg) {      
//         console.log("qsa" + "::" + msg.percent + ' ' + msg.msg);
//         io.emit("qsa", msg);
//     });
// });

io.on('connection', function (socket) {
    socket.on('subscribe', function(room) {
        console.log('joining room', room);
        socket.join(room);
    });

    socket.on('qsa', function(msg, room) {
        console.log('room: ', room + ', msg:  ' + msg.msg);
        io.sockets.in(room).emit('private', msg);
    });

});


