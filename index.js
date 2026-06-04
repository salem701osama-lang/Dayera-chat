const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let msgs = [];

io.on('connection', socket => {
  socket.on('join', name => {
    socket.name = name.substring(0,20);
    socket.emit('history', msgs);
    socket.broadcast.emit('msg', {sys: `${socket.name} دخل`});
  });

  socket.on('msg', data => {
    const m = {
      id: socket.id,
      name: socket.name,
      text: data.text?.slice(0,500),
      img: data.img || null,
      audio: data.audio || null,
      time: new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})
    };
    msgs.push(m);
    if(msgs.length > 100) msgs.shift();
    io.emit('msg', m);
  });

  socket.on('disconnect', () => {
    if(socket.name) socket.broadcast.emit('msg', {sys: `${socket.name} خرج`});
  });
});

http.listen(process.env.PORT || 3000);