const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = 'salem-admin-2026'; // ← غير دي لكلمة سر قوية

const rooms = {
  'العام': { password: null, messages: [], users: [], banned: [] }
};
const userSockets = new Map();
const socketUsers = new Map();

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-index.html'));
});

io.on('connection', (socket) => {
  console.log('مستخدم اتصل:', socket.id);

  socket.on('joinRoom', ({username, room, password, adminKey}) => {
    if(!username || username.length < 2) return socket.emit('error', 'الاسم لازم 2 حروف على الأقل');
    if(!room) return socket.emit('error', 'اكتب اسم الغرفة');

    // إنشاء غرفة جديدة لو الأدمن
    if(!rooms[room]) {
      if(adminKey === ADMIN_KEY) {
        rooms[room] = { password: password || null, messages: [], users: [], banned: [] };
        io.emit('roomsUpdate', Object.keys(rooms));
      } else {
        return socket.emit('error', 'الغرفة مش موجودة');
      }
    }

    // تشيك الباسورد
    if(rooms[room].password && rooms[room].password!== password) {
      return socket.emit('error', 'كلمة سر الغرفة غلط');
    }

    // تشيك الحظر
    if(rooms[room].banned.includes(username.toLowerCase())) {
      return socket.emit('error', 'انت محظور من الغرفة دي');
    }

    socket.join(room);
    const isAdmin = adminKey === ADMIN_KEY;
    socketUsers.set(socket.id, {username, room, isAdmin});
    userSockets.set(username.toLowerCase(), socket.id);

    if(!rooms[room].users.includes(username)) rooms[room].users.push(username);

    socket.emit('joined', {
      room,
      messages: rooms[room].messages.slice(-150),
      isAdmin,
      users: rooms[room].users
    });

    socket.to(room).emit('system', `${username} دخل الغرفة`);
    io.to(room).emit('usersUpdate', rooms[room].users);
    io.emit('roomsUpdate', Object.keys(rooms));
  });

  socket.on('chatMessage', ({msg, img}) => {
    const user = socketUsers.get(socket.id);
    if(!user) return;

    const message = {
      id: crypto.randomBytes(6).toString('hex'),
      username: user.username,
      msg: msg?.slice(0, 1500),
      img,
      time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'}),
      isAdmin: user.isAdmin
    };

    rooms[user.room].messages.push(message);
    if(rooms[user.room].messages.length > 3000) rooms[user.room].messages.shift();

    io.to(user.room).emit('message', message);
  });

  // أوامر الأدمن
  socket.on('banUser', ({username, room}) => {
    const user = socketUsers.get(socket.id);
    if(!user?.isAdmin) return;

    rooms[room].banned.push(username.toLowerCase());
    const targetSocket = userSockets.get(username.toLowerCase());
    if(targetSocket) io.to(targetSocket).emit('kicked', 'تم حظرك نهائي من الغرفة');
    io.to(room).emit('system', `👮 ${username} اتحظر من الأدمن`);
    io.to(room).emit('usersUpdate', rooms[room].users.filter(u => u.toLowerCase()!== username.toLowerCase()));
  });

  socket.on('kickUser', ({username, room}) => {
    const user = socketUsers.get(socket.id);
    if(!user?.isAdmin) return;

    const targetSocket = userSockets.get(username.toLowerCase());
    if(targetSocket) io.to(targetSocket).emit('kicked', 'تم طردك من الغرفة');
    io.to(room).emit('system', `👢 ${username} اتطرد من الغرفة`);
  });

  socket.on('deleteMsg', ({msgId, room}) => {
    const user = socketUsers.get(socket.id);
    if(!user?.isAdmin) return;

    rooms[room].messages = rooms[room].messages.filter(m => m.id!== msgId);
    io.to(room).emit('msgDeleted', msgId);
  });

  socket.on('disconnect', () => {
    const user = socketUsers.get(socket.id);
    if(user) {
      rooms[user.room].users = rooms[user.room].users.filter(u => u!== user.username);
      userSockets.delete(user.username.toLowerCase());
      socketUsers.delete(socket.id);
      io.to(user.room).emit('system', `${user.username} خرج`);
      io.to(user.room).emit('usersUpdate', rooms[user.room].users);
    }
  });
});

server.listen(PORT, () => console.log(`✅ السيرفر شغال على بورت ${PORT}`));