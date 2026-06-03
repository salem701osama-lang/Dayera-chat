const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('join', (username) => {
    onlineUsers[socket.id] = username;
    io.emit('userList', Object.values(onlineUsers));
    io.emit('chat', { user: 'النظام', text: `${username} دخل الدردشة 🔥` });
  });

  socket.on('chat', (msg) => {
    io.emit('chat', { user: onlineUsers[socket.id], text: msg });
  });

  socket.on('disconnect', () => {
    const username = onlineUsers[socket.id];
    delete onlineUsers[socket.id];
    io.emit('userList', Object.values(onlineUsers));
    io.emit('chat', { user: 'النظام', text: `${username} خرج من الدردشة` });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`شغال على ${PORT}`));