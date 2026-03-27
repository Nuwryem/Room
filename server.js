const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');

const app = express();
const ADMIN_NAME = "Saurabh";
const server = http.createServer(app);
const io = new Server(server);
const ADMIN_KEY = "12345";


app.use(express.static('public'));

let data = JSON.parse(fs.readFileSync('data.json'));

function saveData() {
     fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
}

io.on('connection', (socket) => {

    socket.on('joinRoom', ({ roomId, password, username, adminKey }) => {

    // Check admin authentication
    if (username === ADMIN_NAME) {
        if (adminKey !== ADMIN_KEY) {
            socket.emit('errorMessage', 'Wrong admin key');
            return;
        }
        socket.isAdmin = true;
    } else {
        socket.isAdmin = false;
    }

    if (!data.rooms[roomId]) {
        data.rooms[roomId] = {
            password,
            messages: []
        };
    } else {
        if (data.rooms[roomId].password !== password) {
            socket.emit('errorMessage', 'Wrong password');
            return;
        }
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
