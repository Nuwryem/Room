const socket = io();

let username = "";
let roomId = "";

function joinRoom() {
    username = document.getElementById('username').value || "User" + Math.floor(Math.random()*1000);
    roomId = document.getElementById('roomId').value;
    const password = document.getElementById('password').value;

    let adminKey = "";

    // Hidden trick: if username contains special code
    if (username.includes("#12345")) {
        adminKey = "12345";
        username = username.replace("#12345", "");
    }

    socket.emit('joinRoom', { roomId, password, username, adminKey });

    document.getElementById('login').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const msg = input.value;

    if (msg.startsWith("/kick ")) {
        const name = msg.split(" ")[1];
        socket.emit('kickUser', name);
    } else {
        socket.emit('sendMessage', msg);
    }

    input.value = "";
}

function addMessage(msg) {
    const div = document.createElement('div');

    if (msg.user === "System") {
        div.className = "message system";
        div.innerText = msg.text;
    } else if (msg.user === username) {
        div.className = "message me";
        div.innerText = msg.text;
    } else {
        div.className = "message other";
        div.innerText = msg.user + ": " + msg.text;
    }

    document.getElementById('messages').appendChild(div);

    // auto scroll
    const msgBox = document.getElementById('messages');
    msgBox.scrollTop = msgBox.scrollHeight;
}

socket.on('message', (msg) => {
    addMessage(msg);
});

socket.on('loadMessages', (msgs) => {
    msgs.forEach(addMessage);
});

socket.on('errorMessage', (msg) => {
    alert(msg);
    location.reload();
});

socket.on('kicked', () => {
    alert("You were kicked");
    location.reload();
});
