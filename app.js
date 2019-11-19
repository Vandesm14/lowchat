const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io').listen(http);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static('public'));

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.get('/:room', (req, res) => {
	res.sendFile(__dirname + '/public/index.html');
});

app.get('*', (req, res) => {
	res.send('404 Not Found');
});

http.listen(3000, () => console.log('server started'));

io.engine.generateId = (req) => {
	return randHex(6);
};

io.on('connection', (socket) => {
	socket.on('join', (data) => {
		let room;
		let sockets = io.sockets.clients().sockets;
		defaults(socket);
		if (data && data !== '/') {
			room = data.substr(1).replace(/\W/g, '');
		} else {
			room = 'main';
		}
		socket.join(room);
		socket.proto.room = room;
		socket.proto.name = socket.id;

		socket.to(room).emit('message', { name: 'server', message: `${socket.id} has joined` });
		socket.emit('message', { name: 'server', message: `Welcome to the Anonymous Chat! You are currently in room "${room}". To join a different room, type /join [room]` });
	});
	socket.on('message', (data) => {
		defaults(socket);
		let message = data.message.substr(0, 500);
		let name = socket.id;
		let sockets = io.of('/').in(socket.proto.room).sockets;
		let room = socket.proto.room;
		defaults(sockets, true);
		message = message.replace(/<.*>/g, '[html]');

		if (message) {
			if (message[0] === '/') {
				let newname;
				switch (message.split(' ')[0]) {
					case '/key':
						if (message.split(' ')[1] === process.env.ADMIN) {
							if (socket.proto.name[0] !== '@') {
								socket.proto.name = '@' + socket.proto.name;
								io.to(socket.proto.room).emit('message', { name: 'server', message: `${newname} is now an op` });
							} else {
								socket.emit('message', { name: 'server', message: `Error: Already an op` });
							}
						} else {
							socket.emit('message', { name: 'server', message: 'Error: Invalid credentials' });
						}
						break;
					case '/nick':
						newname = message.split(' ')[1].replace(/\W/g, '');
						if (!Object.keys(sockets).find(el => sockets[el].proto.name === newname) && newname !== 'server') {
							socket.proto.name = message.split(' ')[1].replace(/\W/g, '');
							io.to(socket.proto.room).emit('message', { name: 'server', message: `${name} is now known as ${socket.proto.name}` });
						} else {
							socket.emit('message', { name: 'server', message: `Error: Name ${newname} already exists` });
						}
						break;
					case '/help':
						fs.readFile('cmd.txt', 'utf8', (err, file) => {
							socket.emit('message', { name: 'server', message: file.replace(/\n/g, ', ') });
						});
						break;
					case '/users':
						socket.emit('message', { name: 'server', message: Object.keys(sockets).filter(el => sockets[el].proto.room === room).map(el => sockets[el].proto.name).join(', ') });
						break;
					case '/rooms':
						let rooms = occurences(Object.keys(sockets).map(el => sockets[el].proto.room));
						let users = rooms.b;
						rooms = rooms.a;
						// socket.emit('message', { name: 'server', message: Object.keys(sockets).map(el => sockets[el].proto.room).filter((el, i, self) => self.indexOf(el) == i).join(', ') });
						socket.emit('message', { name: 'server', message: rooms.map((el, i) => `${el} (${users[i]})`).join(', ') });
						break;
					default:
						socket.emit('message', { name: 'server', message: 'Error: Unknown command' });
				}
			} else {
				io.to(socket.proto.room).emit('message', { name: socket.proto.name, message: message, color: socket.id });
			}
		}
	});
	socket.on('disconnect', (data) => {
		// socket.to(socket.proto.room).emit('message', { name: 'server', message: `${socket.proto.name} has left` });
	});
});

function defaults(socket, many) {
	if (many) {
		for (let i of Object.keys(socket)) {
			socket[i].proto = socket[i].proto || {};
			socket[i].proto.room = socket[i].proto.room || 'main';
			socket[i].proto.name = socket[i].proto.name || socket[i].id;
		}
	} else {
		socket.proto = socket.proto || {};
		socket.proto.room = socket.proto.room || 'main';
		socket.proto.name = socket.proto.name || socket.id;
	}
}

function randHex(len) {
	var letters = '0123456789abcdef';
	var color = '';
	for (var i = 0; i < len; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}

function copy(arr) {
	return JSON.parse(JSON.stringify(arr));
}

function occurences(arr) {
	arr = copy(arr);
	var a = [], b = [], prev;
	arr.sort();
	for (var i = 0; i < arr.length; i++) {
		if (arr[i] !== prev) {
			a.push(arr[i]);
			b.push(1);
		} else {
			b[b.length - 1]++;
		}
		prev = arr[i];
	}
	return {a, b};
}