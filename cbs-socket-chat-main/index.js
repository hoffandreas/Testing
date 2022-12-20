const express = require("express")
const sqlite3 = require('sqlite3').verbose();
app = express();
app.use(express.static(__dirname + '/public'))
const session = require("express-session");
const path = require('path');
const server = require("http").createServer(app);
const bcrypt = require('bcryptjs'); //bcrypt hash is an async function, very slow alorithm

// Sqlite ting
const db = new sqlite3.Database('./db.sqlite');

db.serialize(function() {
  console.log('creating databases if they don\'t exist');
  db.run('create table if not exists messages (messageid integer primary key, username text not null, message text, timestamp integer)');
}); // sqlite database


// Tilføjer message til db `message: {username, message}`
const addMessageToDatabase = (message) => {
  db.run(
    'insert into messages (username, message, timestamp) values (?, ?, ?)',
    [message.username, message.message, Date.now()], 
    function(err) {
      if (err) {
        console.error(err);
      }
    }
  );
}

// får beskeder fra databasen
const getAllMessages = () => {
  // Smart måde at konvertere fra callback til promise:
  return new Promise((resolve, reject) => {  
    db.all('select * from messages', (err, rows) => {
      if (err) {
        console.error(err);
        return reject(err);
      }
      return resolve(rows);
    });
  })
}

// socket IO ting
var io = require("socket.io")(server, {
    /* Handling CORS: https://socket.io/docs/v3/handling-cors/ for ngrok.io */
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
});

io.on('connection', function(socket){

  // Når en ny bruger joiner
  socket.on('join', async function(name){
    socket.username = name
    io.sockets.emit("addChatter", name);
    io.sockets.emit('new_message', {username: 'Server', message: 'Velkommen ' + name + '!'});

    const messages = await getAllMessages();
    io.sockets.emit('messages', messages, {username: 'Server', message: 'Velkommen ' + name + '!'});
    // Opgave 1b ...

  });

  // Når server modtager en ny besked
  socket.on('new_message', function(message){
    // Opgave 1a ...
    addMessageToDatabase({message: message, username: socket.username});
    const username = socket.username
    console.log(username + ': ' + message);
    io.sockets.emit("new_message", {username, message});
  });
  
  // Når en bruger disconnecter
  socket.on('disconnect', function(name){
    io.sockets.emit("removeChatter", socket.username);
  });
});
const isAuth = (req, res, next) => { //creating an authentication where you must have a user to access the dashboard
  if(req.session.isAuth){
      next()
  } else {
      res.redirect("../login.html")
  }
}

app.get("/", (req, res ) => {
  return res.sendFile("/signup.html", { root: path.join(__dirname, "../public") });
})

app.get("/signup.html", (req, res ) => {
  return res.sendFile("/signup.html", { root: path.join(__dirname, "../public") });
})

app.get("/login.html", (req, res ) => {
  return res.sendFile("/login.html", { root: path.join(__dirname, "../public") });
})

app.get("/index.html", isAuth, (req, res ) => { //Need to be autenticated to access to dashboard.html
  return res.sendFile("/index.html", { root: path.join(__dirname, "../public") });
})




app.post('/signup', async (req, res) => {
  try {
      const {username, password} = req.body; //sending username and Password to endpoint /signup

      const hash = await bcrypt.hash(password, 13); /*This is how you can combine hash and salt function together. Nr 13 is a salt generator. 
      The higher the generator number is the more times the password gets randomized so it becomes safer.The higher the number,the slower the funciton becomes*/
      await db('users').insert({username: username, password: hash}); //Inserting the hash and username to the 'users' dababase
  
      return res.redirect('../login.html')

  } catch(error) {
      const name = await req.body.username
      if(name.length > 0) {
          res.status(400).json('Error message, This username is already been taken!')
      } else {
          res.status(400).json('Something went wrong... Username or password is missing!');
      }
  }
});

app.post('/login', async (req, res) => {
  try {
      const {username, password} = req.body; //sending username and Password to endpoint /login

      const user = await db('users').first('*').where({username: username}); //From the users table, we want to select the first row where the username equals to the username from the request body.

      if(user) { // Here we check if the user exists in the database and check if the password is correct event though the password is hashed. The compare method helps us here to identify hashed password. We can do this because the input always gives the same output
          const auothenticate = await bcrypt.compare(password, user.password); 
          if(auothenticate) {
              req.session.isAuth = true; //If you are logged in, then you can access the dashboard.
              res.redirect("../dashboard.html")
          } else {
              res.redirect("../login.html") //If you have the wrong password
          }
      } else {
          res.status(404).redirect("../login.html"); //If the user dont exists
      }

  } catch(error) {
      res.status(400).json('Something went wrong... Username or password is not matching!');
  }
});


server.listen(3001, function(){
  console.log('Server started on port 3001')
});


