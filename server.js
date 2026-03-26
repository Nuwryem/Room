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

    socket.on('sendMessage', (msg) => {
        const room = data.rooms[socket.roomId];
        if (!room) return;

        const message = {
            user: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString()
        };

        room.messages.push(message);

        if (room.messages.length > 200) {
            room.messages.shift();
        }

        saveData();
        io.to(socket.roomId).emit('message', message);
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
