const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {cors:{origin:"*"}, maxHttpBufferSize:1e8});

app.use(express.static(path.join(__dirname)));
app.get('/', (req,res) => res.sendFile(path.join(__dirname,'public-index.html')));

let onlineUsers = {}, chatHistory = [];
const MAX = 2000;

const bad = ['احا','كسمك','كس امك','كسامك','خول','يا خول','عرص','منيوك','متناك','شرموط','شرموطة','لبوة','نيك','منيك','fuck','shit','bitch'];
function hasBad(t){
  if(!t) return 0;
  t = t.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g,'');
  return bad.some(w => t.includes(w.replace(/[^a-z0-9\u0600-\u06FF]/g,'')))
}

io.on('connection', s => {
  s.on('join', name => {
    onlineUsers[s.id] = {name};
    s.emit('chatHistory', chatHistory);
    s.emit('yourId', s.id);
    io.emit('userList', Object.values(onlineUsers).map(u=>u.name));
    io.emit('chat',{user:'النظام',name:'النظام',text:name+' دخل الدردشة 🔥',time:new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),msgId:'sys'+Date.now(),userId:'system'});
  });

  s.on('chat', d => {
    const u = onlineUsers[s.id];
    if(!u) return;
    if(d.text && hasBad(d.text)){
      return s.emit('chat',{user:'النظام',name:'النظام',text:'⚠️ ممنوع الشتايم يا '+u.name,msgId:'warn'+Date.now(),userId:'system'});
    }
    const msg = {
      msgId: Date.now()+Math.random(),
      user: u.name,
      userId: s.id,
      text: d.text?d.text.slice(0,500):'',
      img: d.img||null,
      audio: d.audio||null,
      replyTo: d.replyTo||null,
      time: new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),
      read: false
    };
    chatHistory.push(msg);
    if(chatHistory.length>MAX) chatHistory.shift();
    io.emit('chat',msg);
  });

  s.on('deleteMsg', msgId => {
    const msg = chatHistory.find(m => m.msgId == msgId);
    if(msg && msg.userId === s.id){
      chatHistory = chatHistory.filter(m => m.msgId!= msgId);
      io.emit('msgDeleted', msgId);
    }
  });

  s.on('markRead', msgId => {
    const msg = chatHistory.find(m => m.msgId == msgId);
    if(msg && msg.userId!== s.id){
      msg.read = true;
      io.emit('msgRead', msgId);
    }
  });

  s.on('disconnect', () => {
    const u = onlineUsers[s.id];
    if(u){
      delete onlineUsers[s.id];
      io.emit('userList', Object.values(onlineUsers).map(u=>u.name));
      io.emit('chat',{user:'النظام',name:'النظام',text:u.name+' خرج من الدردشة',msgId:'sys'+Date.now(),userId:'system'});
    }
  });
});

server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('دايرة شات شغال'));