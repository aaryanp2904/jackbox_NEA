const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
var classes = require("./classes");



// Instantiate a whole new game, this just helps keep track of rooms
game = new classes.Game();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/lobby', (req, res) => {
    res.sendFile(__dirname + '/lobby.html');
  });

app.get('/host', (req, res) => {
    res.sendFile(__dirname + '/host.html');
  });

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.emit('conf')

  socket.on('create-room', data => {
    room = new classes.Room(socket);
    game.addRoom(room);
    console.log('Code is' + room.getCode())
    socket.emit('room-details-code', room.getCode())
  })


  socket.on('client-details', data => {
      const room_code = data[0];
      const nickname = data[1];
      let player = new classes.Player(nickname, room_code, socket)
      roomToJoin = game.findRoom(room_code);
      if (roomToJoin){
        socket.join(room_code)
        socket.emit('joining-response', true)
        roomToJoin.addPlayer(player)
        roomToJoin.getHost().emit('player-list',roomToJoin.getPlayerNames())
      }

      else{
          socket.emit('joining-response', false)
          
      }
    })

  socket.on('game-ready', data => {
        console.log('Game with host ' + socket.id + ' and code '+ data + ' is ready.')
        game.findRoom(data).makeCaptainOrder()
        game.findRoom(data).getPlayers()[0].getSock().emit('your-turn')
        socket.to(game.findRoom(data).getCode()).emit('choosing', game.findRoom(data).getPlayers()[0].getName())
    })

  socket.on('opinion', data => {
    console.log('Opinion option selected')
    socket.emit('players',  game.findRoom(data).getPlayers())
  })

  socket.on('player_selection', data => {
    console.log(data + ' has been chosen')
  })


})



server.listen(3000, () => {
  console.log('listening on *:3000');
});


