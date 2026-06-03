const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({limit: '10mb', extended: true}));

// كلمة سر الأدمن - غيرها
const ADMIN_PASSWORD = 'salem-secret-2026';

// تخزين مؤقت - هيتمسح لو السيرفر رستر
let rooms = {};
let users = {};

io.on('connection', (socket) => {
  console.log('مستخدم جديد اتصل');

  // دخول الغرفة
  socket.on('joinRoom', ({username, room}) => {
    if(!username ||!room) {
      socket.emit('error', 'اسمك واسم الغرفة مطلوبين');
      return;
    }

    username = username.trim().substring(0, 20);
    room = room.trim().substring(0, 30);

    // اعمل الغرفة لو مش موجودة
    if(!rooms[room]) {
      rooms[room] = {
        messages: [],
        users: []
      };
    }

    // شوف لو الاسم موجود في الغرفة
    if(rooms[room].users.includes(username)) {
      socket.emit('error', 'الاسم ده موجود في الغرفة، غيره');
      return;
    }

    // سجل المستخدم
    socket.username = username;
    socket.room = room;
    users[socket.id] = {username, room};
    rooms[room].users.push(username);
    socket.join(room);

    // ابعت الرسايل القديمة
    socket.emit('joined', {
      room: room,
      messages: rooms[room].messages.slice(-150)
    });

    // بلغ الكل ان فيه حد دخل
    socket.to(room).emit('system', `${username} دخل الغرفة`);
    console.log(`${username} دخل غرفة ${room}`);
  });

  // رسالة جديدة
  socket.on('chatMessage', ({msg, img}) => {
    if(!socket.room ||!socket.username) return;

    const message = {
      id: Date.now().toString(),
      username: socket.username,
      msg: msg? msg.substring(0, 1000) : null,
      img: img || null,
      time: new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute: '2-digit'})
    };

    rooms[socket.room].messages.push(message);

    // احتفظ بآخر 200 رسالة بس
    if(rooms[socket.room].messages.length > 200) {
      rooms[socket.room].messages = rooms[socket.room].messages.slice(-200);
    }

    io.to(socket.room).emit('message', message);
  });

  // خروج
  socket.on('disconnect', () => {
    if(socket.room && socket.username) {
      rooms[socket.room].users = rooms[socket.room].users.filter(u => u!== socket.username);
      socket.to(socket.room).emit('system', `${socket.username} خرج من الغرفة`);
      delete users[socket.id];

      // امسح الغرفة لو فضيت
      if(rooms[socket.room].users.length === 0) {
        delete rooms[socket.room];
      }
    }
    console.log('مستخدم خرج');
  });
});

// صفحة الأد