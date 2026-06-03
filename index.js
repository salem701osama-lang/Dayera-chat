const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-index.html'));
});

let onlineUsers = {};
let chatHistory = []; // هنخزن الرسايل هنا
const MAX_MESSAGES = 2000; // عايز 1000 غير الرقم ده

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (username) => {
    onlineUsers[socket.id] = { id: socket.id, name: username };

    // ابعت تاريخ الشات كله للي دخل جديد
    socket.emit('chatHistory', chatHistory);

    io.emit('userList', Object.values(onlineUsers).map(u => u.name));
    io.emit('chat', { user: 'النظام', text: username + ' دخل الدردشة 🔥', time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}) });
  });

  socket.on('chat', (data) => {
    const user = onlineUsers[socket.id];
    if(user) {
      const msg = {
        user: user.name,
        text: data.text || '',
        img: data.img || null,
        time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'}),
        id: socket.id
      };

      // خزن الرسالة
      chatHistory.push(msg);
      // لو عدينا 2000 امسح أقدم واحدة
      if(chatHistory.length > MAX_MESSAGES) chatHistory.shift();

      io.emit('chat', msg);
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