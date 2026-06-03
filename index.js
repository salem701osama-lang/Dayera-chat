const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = 'salem-secret-2026'; // ← غير دي لكلمة سر محدش يعرفها

// تخزين البيانات في الميموري
let rooms = {
  'العام': { messages: [], users: [], banned: [] }
};
const userSockets = new Map(); // username -> socket.id
const socketUsers = new Map(); // socket.id -> {username, room}

// الملفات الثابتة
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public-index.html'));
});

// صفحة الأدمن المخفية - محدش يوصلها غيرك
app.get(`/admin/${ADMIN_SECRET}`, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-panel.html'));
});

io.on('connection', (socket) => {
  console.log('مستخدم اتصل:', socket.id);

  // دخول غرفة - مفيش باسورد خالص
  socket.on('joinRoom', ({username, room}) => {
    if(!username || username.length < 2) return socket.emit('error', 'الاسم لازم حرفين على الأقل');
    if(!room) return socket.emit('error', 'اكتب اسم الغرفة');

    // إنشاء الغرفة لو جديدة
    if(!rooms) {
      rooms = { messages: [], users: [], banned: [] };
      io.emit('roomsUpdate', Object.keys(rooms));
    }

    // تشيك الحظر بس
    if(rooms.banned.includes(username.toLowerCase())) {
      return socket.emit('error', 'انت محظور من الغرفة دي');
    }

    socket.join(room);
    socketUsers.set(socket.id, {username, room});
    userSockets.set(username.toLowerCase(), socket.id);

    if(!rooms.users.includes(username)) rooms.users.push(username);

    socket.emit('joined', {
      room,
      messages: rooms.messages.slice(-150)
    });

    socket.to(room).emit('system', `${username} دخل الغرفة`);
    io.to(room).emit('usersUpdate', rooms.users);
  });

  // إرسال رسالة أو صورة
  socket.on('chatMessage', ({msg, img}) => {
    const user = socketUsers.get(socket.id);
    if(!user) return;

    const message = {
      id: crypto.randomBytes(6).toString('hex'),
      username: user.username,
      msg: msg?.slice(0, 1500),
      img,
      time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'})
    };

    rooms[user.room].messages.push(message);
    if(rooms[user.room].messages.length > 3000) rooms[user.room].messages.shift();

    io.to(user.room).emit('message', message);
  });

  // أوامر الأدمن - من الصفحة المخفية بس
  socket.on('adminAction', ({action, data, adminKey}) => {
    if(adminKey!== ADMIN_SECRET) return;

    const room = data.room;
    if(!rooms) return;

    if(action === 'ban') {
      rooms.banned.push(data.username.toLowerCase());
      const targetSocket = userSockets.get(data.username.toLowerCase());
      if(targetSocket) io.to(targetSocket).emit('kicked', 'تم حظرك نهائي من الغرفة');
      io.to(room).emit('system', `👮 ${data.username} اتحظر نهائي`);
      io.to(room).emit('usersUpdate', rooms.users.filter(u => u.toLowerCase()!== data.username.toLowerCase()));
    }

    if(action === 'kick') {
      const targetSocket = userSockets.get(data.username.toLowerCase());
      if(targetSocket) io.to(targetSocket).emit('kicked', 'تم طردك من الغرفة');
      io.to(room).emit('system', `👢 ${data.username} اتطرد`);
    }

    if(action === 'deleteMsg') {
      rooms.messages = rooms.messages.filter(m => m.id!== data.msgId);
      io.to(room).emit('msgDeleted', data.msgId);
    }
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