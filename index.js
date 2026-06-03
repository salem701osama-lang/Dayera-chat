const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e8 // عشان الصور والريكورد
});

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-index.html'));
});

let onlineUsers = {};
let chatHistory = [];
const MAX_MESSAGES = 2000;

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    onlineUsers[socket.id] = { id: socket.id, name: username };

    // ابعت التاريخ للي دخل جديد
    socket.emit('chatHistory', chatHistory);

    io.emit('userList', Object.values(onlineUsers).map(u => u.name));
    io.emit('chat', {
      user: 'النظام',
      text: username + ' دخل الدردشة 🔥',
      time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
      msgId: 'sys-' + Date.now(),
      id: 'system'
    });
  });

  socket.on('chat', (data) => {
    const user = onlineUsers[socket.id];
    if(user) {
      const msg = {
        msgId: Date.now() + Math.random(),
        user: user.name,
        text: data.text || '',
        img: data.img || null,
        audio: data.audio || null,
        time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
        id: socket.id
      };

      chatHistory.push(msg);
      if(chatHistory.length > MAX_MESSAGES) chatHistory.shift();

      io.emit('chat', msg);
    }
  });

  // مسح الرسالة
  socket.on('deleteMsg', (msgId) => {
    const user = onlineUsers[socket.id];
    if(user) {
      chatHistory = chatHistory.filter(m => m.msgId!= msgId);
      io.emit('msgDeleted', msgId);
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if(user) {
      delete onlineUsers[socket.id];
      io.emit('userList', Object.values(onlineUsers).map(u => u.name));
      io.emit('chat', {
        user: 'النظام',
        text: user.name + ' خرج من الدردشة',
        time: '',
        msgId: 'sys-' + Date.now(),
        id: 'system'
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('دايرة شات شغال على بورت ' + PORT);
});