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

// فلتر الشتايم اللي طلبته
const bad = ['كسمك','كس امك','شرموط','عرص','منيوك','متناك','لبوة','fuck','shit','bitch'];
function hasBad(t){if(!t)return 0;t=t.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g,'');return bad.some(w=>t.includes(w))}

io.on('connection', s => {
  s.on('join', name => {
    onlineUsers[s.id] = {name};
    s.emit('chatHistory', chatHistory);
    io.emit('userList', Object.values(onlineUsers).map(u=>u.name));
    io.emit('chat',{user:'النظام',text:name+' دخل 🔥',time:new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),msgId:'sys'+Date.now(),id:'system'});
  });

  s.on('chat', d => {
    const u = onlineUsers[s.id];
    if(!u) return;
    if(d.text && hasBad(d.text)){
      return s.emit('chat',{user:'النظام',text:'⚠️ ممنوع الشتايم يا '+u.name,msgId:'warn'+Date.now(),id:'system'});
    }
    const msg = {
      msgId: Date.now()+Math.random(),
      user: u.name,
      text: d.text?d.text.slice(0,500):'',
      img: d.img||null,
      audio: d.audio||null,
      time: new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'}),
      id: s.id
    };
    chatHistory.push(msg);
    if(chatHistory.length>MAX) chatHistory.shift();
    io.emit('chat',msg);
  });

  s.on('deleteMsg', id => {
    chatHistory = chatHistory.filter(m=>m.msgId!=id);
    io.emit('msgDeleted',id);
  });

  s.on('disconnect', () => {
    const u = onlineUsers[s.id];
    if(u){
      delete onlineUsers[s.id];
      io.emit('userList', Object.values(onlineUsers).map(u=>u.name));
      io.emit('chat',{user:'النظام',text:u.name+' خرج',msgId:'sys'+Date.now(),id:'system'});
    }
  });
});

server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('شغال'));