const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {maxHttpBufferSize: 1e8});

app.use(express.static('public'));

let msgs = [];

// فلتر الكلمات الممنوعة - زود براحتك
const bannedWords = [
  'كسمك', 'كس امك', 'كس ام', 'شرموط', 'عرص', 'منيوك', 'متناك', 'لبوة',
  'fuck', 'shit', 'bitch', 'motherfucker', 'slut', 'asshole'
];

function hasBadWords(text) {
  if(!text) return false;
  const clean = text.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ');
  return bannedWords.some(word => clean.includes(word));
}

io.on('connection', socket => {
  socket.on('join', name => {
    socket.name = name.substring(0,20);
    socket.warnings = 0;
    socket.emit('history', msgs);
    socket.broadcast.emit('msg', {sys: socket.name + ' دخل الشات'});
  });

  socket.on('msg', data => {
    if(!socket.name) return;

    // فلتر النص - لو فيه شتايم امسحها
    if(data.text && hasBadWords(data.text)) {
      socket.warnings++;
      socket.emit('msg', {
        sys: '⚠️ الرسالة اتمسحت عشان فيها ألفاظ. تحذير ' + socket.warnings + '/3'
      });
      if(socket.warnings >= 3) {
        socket.emit('msg', {sys: '🚫 تم طردك دقيقة بسبب تكرار الألفاظ'});
        setTimeout(() => socket.disconnect(), 1000);
      }
      return;
    }

    const m = {
      id: socket.id,
      name: socket.name,
      text: data.text? data.text.slice(0,500) : '',
      img: data.img || null,
      audio: data.audio || null,
      time: new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})
    };

    msgs.push(m);
    if(msgs.length > 400) msgs.shift(); // 400 رسالة
    io.emit('msg', m);
  });

  socket.on('disconnect', () => {
    if(socket.name) socket.broadcast.emit('msg', {sys: socket.name + ' خرج'});
  });
});

http.listen(process.env.PORT || 3000, () => console.log('دايرة شات شغالة'));