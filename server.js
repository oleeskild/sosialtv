//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//Only used in development to read the password from a file
var fs = require("fs");

//Setting up a connection to the mongoDB
var mongojs = require("mongojs");
var monk = require("monk");


//Store the password to the mongodb in a seperate file to make it easier to push to github
//without compromising the password.
var dbPass = fs.readFileSync('./pass/pass.txt','utf8');
var db = monk('node:'+dbPass+'@ds055680.mongolab.com:55680/chat_test');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

//Connect to database
var collection = db.get("messages");

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = [];
var sockets = [];

collection.find({},{}, function(err, data){
  if(err){
    console.log(err);
    return;
  }
  //console.log(data.name);
  data.forEach(function(msg){
    messages.push(msg);
  });
  
  
});

io.on('connection', function (socket) {
    messages.forEach(function (data) {
      socket.emit('message', data);
    });

    sockets.push(socket);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var text = String(msg || '');

      if (!text)
        return;

      socket.get('name', function (err, name) {
        var data = {
          name: name,
          text: text
        };

        broadcast('message', data);
        messages.push(data);
      });
    });

    socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
        updateRoster();
      });
    });
  });

function updateRoster() {
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('name', callback);
    },
    function (err, names) {
      broadcast('roster', names);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
