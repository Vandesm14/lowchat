const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io').listen(http);
const cookieParser = require('cookie-parser');
require('dotenv').config();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(cookieParser());

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
		let rooms;
		let sockets = io.sockets.clients().sockets;
		defaults(socket);
		if (data && data !== '/') {
			room = data.substr(1).replace(/\W/g, '');
		} else {
			room = 'main';
		}
		if (!Object.keys(sockets).includes(room)) {
			socket.proto.room = room;
			socket.proto.name = socket.id;
			socket.proto.id = socket.id;
			socket.proto.created = new Date();
			socket.proto.admin = false;
			rooms = Object.keys(sockets).map(el => sockets[el].proto.room);
			socket.join(room);
			socket.emit('bounce', { type: 'join', status: true });
			socket.to(room).emit('message', {
				name: 'server',
				message: `${socket.proto.id} has joined`
			});
			socket.emit('message', {
				name: 'server',
				message: `Welcome to LowChat v2! You are currently in room "${socket.proto.room}". To join a different room, type /join [room]. Type /help to see more commands`
			});
			if (rooms.filter(el => el === socket.proto.room).length === 1 && socket.proto.room !== 'main') {
				socket.proto.admin = true;
				io.to(socket.proto.room).emit('message', {
					name: 'server',
					message: `${socket.proto.name} is now an op`
				});
			}
		} else {
			socket.emit('message', {
				name: 'server',
				message: `Error: "${room}" is a user (go back to <a href="/">main</a>?)`
			});
			socket.disconnect();
		}
	});

	socket.on('message', (data) => {
		defaults(socket);
		let message = data.message.substr(0, 500);
		let name = socket.proto.id;
		let sockets = io.of('/').in(socket.proto.room).sockets;
		let room = socket.proto.room;
		defaults(sockets, true);
		if (message) {
		message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
			if (message[0] === '/') {
				let newname;
				let recipient;
				let rooms;
				switch (message.split(' ')[0]) {
					case '/msg':
						let recipient = Object.keys(sockets).find(el => sockets[el].proto.name === message.split(' ')[1]);
						if (recipient) {
							socket.to(recipient).emit('message', {
								name: '>' + socket.proto.name,
								message: message.split(' ').slice(2).join(' '),
								color: socket.id
							});
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: User ${message.split(' ')[1]} does not exist`
							});
						}
						break;
					case '/key':
						if (message.split(' ')[1] === process.env.ADMIN) {
							if (socket.proto.name[0] !== '@') {
								socket.proto.name = '@' + socket.proto.name;
								io.to(socket.proto.room).emit('message', {
									name: 'server',
									message: `${socket.proto.name} is now an op`
								});
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: Already an op`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: 'Error: Invalid credentials'
							});
						}
						break;
					case '/nick':
						if (message.split(' ')[1] && message.split(' ')[1].replace(/\W/g, '')) {
							newname = message.split(' ')[1].replace(/\W/g, '').substr(0, 30);
							if (!Object.keys(sockets).find(el => sockets[el].proto.name === newname && sockets[el].proto.room === room) && newname !== 'server') {
								if (socket.proto.admin) {
									socket.proto.name = '@' + newname;
								} else {
									socket.proto.name = newname;
								}
								io.to(socket.proto.room).emit('message', {
									name: 'server',
									message: `${name} is now known as ${socket.proto.name}`
								});
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: Name ${newname} already exists`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: Invalid Syntax`
							});
						}
						break;
					case '/help':
						fs.readFile('cmd.txt', 'utf8', (err, file) => {
							socket.emit('message', {
								name: 'server',
								message: file.replace(/\n/g, ', ')
							});
						});
						break;
					case '/users':
						socket.emit('message', {
							name: 'server',
							message: Object.keys(sockets).filter(el => sockets[el].proto.room === room).map(el => sockets[el].proto.name).join(', ')
						});
						break;
					case '/rooms':
						rooms = occurences(Object.keys(sockets).map(el => sockets[el].proto.room));
						let users = rooms.b;
						rooms = rooms.a;
						socket.emit('message', {
							name: 'server',
							message: rooms.map((el, i) => `<a href="/${el}" target="_self">${el}</a> (${users[i]})`).join(', ')
						});
						break;
					default:
						socket.emit('message', {
							name: 'server',
							message: 'Error: Unknown command'
						});
				}
			} else {
				io.to(socket.proto.room).emit('message', {
					name: socket.proto.name,
					message: message,
					color: socket.proto.id
				});
			}
		}
	});
	socket.on('disconnect', (data) => {
		if (socket && socket.proto && socket.proto.room) {
			socket.to(socket.proto.room).emit('message', {
				name: 'server',
				message: `${socket.proto.name} has left`
			});
		}
	});
});

function defaults(socket, many) {
	if (many) {
		for (let i of Object.keys(socket)) {
			socket[i].proto = socket[i].proto || {};
			socket[i].proto.room = socket[i].proto.room || 'main';
			socket[i].proto.name = socket[i].proto.name || socket[i].id;
			socket[i].proto.id = socket[i].proto.id || socket[i].id;
			socket[i].proto.muted = socket[i].proto.muted || false;
			socket[i].proto.created = socket[i].proto.created || new Date();
			socket[i].proto.admin = socket[i].proto.admin || false;
		}
	} else {
		socket.proto = socket.proto || {};
		socket.proto.room = socket.proto.room || 'main';
		socket.proto.name = socket.proto.name || socket.id;
		socket.proto.id = socket.proto.id || socket.id;
		socket.proto.muted = socket.proto.muted || false;
		socket.proto.created = socket.proto.created || new Date();
		socket.proto.admin = socket.proto.admin || false;
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
	var a = [],
		b = [],
		prev;
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
	return {
		a,
		b
	};
}