const express = require("express")
app = express();
const server = require("http").createServer(app);
var io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});

app.use(express.static(__dirname + '/public'))

io.on('connection', function(socket){
  socket.on('delta', async function(name){
    socket.username = name
    io.sockets.emit("addChatter", name);
  });

  socket.on('new_message', function(message){
    const username = socket.username
    console.log(username + ': ' + message);
    io.sockets.emit("new_message", {username, message});
  });

    socket.on('disconnect', function(name){
    io.sockets.emit("removeChatter", socket.username);
  });
});

app.get("/", (req, res) => {
  res.sendFile("/index.html")
})

server.listen(3001, function(){
  console.log('Server started on port 3001')
});
