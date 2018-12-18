var socketio = require("socket.io");
var io;
var guestNumber = 1;
var namesUsed = [];
var roomsUsed = [];
var currentRoom = {};
var nickNames = {};
nickNames;
exports.listen = function(server) {
  io = socketio.listen(server);
  io.sockets.on("connection", function(socket) {
    guestNumber = assignGuestName(socket);
    joinRoom(socket, "myroom1");
    handleMessageBroadcasting(socket);
    handleNameChangeAttempts(socket);
    handleRoomJoining(socket);
    console.log(
      "char_server: rooms.length=" + roomsUsed.length + ", rooms=" + roomsUsed
    );
    socket.on("rooms", function() {
      socket.emit("rooms", roomsUsed);
    });
    handleClientDisconnection(socket);
  });
};
function assignGuestName(socket) {
  var name = "Guest" + guestNumber;
  nickNames[socket.id] = name;
  socket.emit("nameResult", { success: true, name: name });
  namesUsed.push(name);
  return guestNumber + 1;
}
function joinRoom(socket, room) {
  socket.join(room); //这个
  if (roomsUsed.indexOf(room) == -1) {
    roomsUsed.push(room);
  }
  currentRoom[socket.id] = room;
  socket.emit("joinResult", { room: room });
  socket.broadcast.to(room).emit("message", {
    text: nickNames[socket.id] + " has joined " + room + "."
  });
  var usersInRoomSummary = "Users currently in " + room + ": ";
  var userArray = [];
  for (let croom in currentRoom) {
    if (room === currentRoom[croom]) {
      for (let index in nickNames) {
        userArray.push(nickNames[index]);
        console.log(
          "joinRoom: find a user in the room. id=" +
            croom +
            ", room=" +
            currentRoom[croom] +
            ", user=" +
            nickNames[index]
        );
      }
    }
  }
  usersInRoomSummary += userArray.join(",") + ".";
  socket.emit("message", { text: usersInRoomSummary });
}
function handleNameChangeAttempts(socket) {
  socket.on("nameAttempt", function(name) {
    if (name.indexOf("Guest") == 0) {
      socket.emit("nameResult", {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else {
      if (namesUsed.indexOf(name) == -1) {
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];
        socket.emit("nameResult", { success: true, name: name });
        socket.broadcast.to(currentRoom[socket.id]).emit("message", {
          text: previousName + " is now known as " + name + "."
        });
      } else {
        socket.emit("nameResult", {
          success: false,
          message: "That name is already in use."
        });
      }
    }
  });
}
function handleMessageBroadcasting(socket) {
  socket.on("message", function(message) {
    socket.broadcast.to(message.room).emit("message", {
      text: nickNames[socket.id] + ": " + message.text
    });
  });
}
function handleRoomJoining(socket) {
  socket.on("join", function(room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}
function handleClientDisconnection(socket) {
  socket.on("disconnect", function() {
    var nameIndex = nameUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
