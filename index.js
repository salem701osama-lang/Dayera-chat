const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-index.html'));
});

let onlineUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join', (username) => {
    onlineUsers[socket.id] = { id: socket.id, name: username };
    io.emit('userList', Object.values(onlineUsers).map(u => u.name));
    io.emit('chat', { user: 'النظام', text: username + ' دخل الدردشة 🔥', time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}) });
  });

  socket.on('chat', (msg) => {
    const user = onlineUsers[socket.id];
    if(user) {
      io.emit('chat', { 
        user: user.name, 
        text: msg,
        time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
        id: socket.id
      });
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if(user) {
      delete onlineUsers[socket.id];
      io.emit('userList', Object.values(onlineUsers).map(u => u.name));
      io.emit('chat', { user: 'النظام', text: user.name + ' خرج من الدردشة', time: '' });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server شغال على بورت ' + PORT);
});