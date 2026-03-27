socket.emit('errorMessage', 'Wrong password');
return;
}


// Prevent duplicate usernames in same room
for (let [id, s] of io.of("/").sockets) {
if (s.roomId === roomId && s.username === username) {
socket.emit('errorMessage', 'Username already taken');
return;
}
}

socket.join(roomId);  
socket.roomId = roomId;  
socket.username = username;  

socket.emit('loadMessages', data.rooms[roomId].messages);  

io.to(roomId).emit('message', {  
    user: 'System',  
    text: `${username} joined`,  
    time: new Date().toLocaleTimeString()  
});

});

socket.lastMessageTime = 0;

socket.on('sendMessage', (text) => {

const now = Date.now();  

// Limit: 1 message per 1 second  
if (now - socket.lastMessageTime < 1000) {  
    return;  
}  

socket.lastMessageTime = now;  

if (!data.rooms[socket.roomId]) return;  

const msg = {  
    user: socket.username,  
    text,  
    time: new Date().toLocaleTimeString()  
};  

data.rooms[socket.roomId].messages.push(msg);

saveData();

// limit 200 messages  
if (data.rooms[socket.roomId].messages.length > 200) {  
    data.rooms[socket.roomId].messages.shift();  
}  

io.to(socket.roomId).emit('message', msg);

});

socket.on('kickUser', (targetName) => {

// Only admin can kick  
if (!socket.isAdmin) {  
return;

}

for (let [id, s] of io.of("/").sockets) {  
    if (s.username === targetName && s.roomId === socket.roomId) {  
        s.emit('kicked');  
        s.leave(socket.roomId);  
    }  
}

});

socket.on('disconnect', () => {
if (socket.roomId) {
io.to(socket.roomId).emit('message', {
user: 'System',
text: `${socket.username} left`,
time: new Date().toLocaleTimeString()
});
}
});

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
console.log("Server running on port " + PORT);
});

