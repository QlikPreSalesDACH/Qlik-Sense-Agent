var socket;
var socketHelper = {
    createConnection: function(url)
    {
        socket = require('socket.io-client')(url, {
            secure: true,
            reconnect: true
        });
    },
    sendMessageRoom: function(app, msg, room) {
        socket.emit(app, msg, room);
    },
    sendMessage: function(app, msg) {
        socket.emit(app, msg);
    }
}
module.exports = socketHelper;
