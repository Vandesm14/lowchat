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

// io.of('/').sockets;
function query(obj, and, db) {
	let keys = Object.keys(obj);
	let values = Object.values(obj);
	let main = {};
	let ret = {};
	db = db || io.of('/').sockets;
	for (let i in keys) {
		if (i > 0 && and) {
			Object.keys(main).filter(el => db[el].proto[keys[i]] === values[i]).map(el => ret[el] = db[el]);
		} else {
			Object.keys(db).filter(el => db[el].proto[keys[i]] === values[i]).map(el => main[el] = db[el]);
		}
	}
	if (and) {
		return ret;
	} else {
		return main;
	}
}

function queryKeys(obj, and, db) {
	let keys = Object.keys(obj);
	let values = Object.values(obj);
	let main = {};
	let ret = {};
	db = db || io.of('/').sockets;
	for (let i in keys) {
		if (i > 0 && and) {
			Object.keys(main).filter(el => db[el].proto[keys[i]] === values[i]).map(el => ret[el] = db[el]);
		} else {
			Object.keys(db).filter(el => db[el].proto[keys[i]] === values[i]).map(el => main[el] = db[el]);
		}
	}
	if (and) {
		return Object.keys(ret);
	} else {
		return Object.keys(main);
	}
}

io.on('connection', (socket) => {
	socket.on('join', (data) => {
		let room;
		let rooms;
		defaults(socket);
		if (data && data !== '/') {
			room = data.substr(1).replace(/\W/g, '');
		} else {
			room = 'main';
		}
		// let sockets = io.of('/').in(room).sockets;
		let allsockets = io.of('/').sockets;
		defaults(allsockets, true);
		let sockets = query({
			room: room
		});
		if (!Object.keys(allsockets).includes(room)) {
			socket.proto.room = room;
			socket.proto.name = socket.id;
			socket.proto.id = socket.id;
			socket.proto.created = new Date();
			socket.proto.admin = false;

			rooms = Object.keys(allsockets).map(el => allsockets[el].proto.room);
			socket.join(room);
			socket.emit('bounce', {
				type: 'join',
				status: true
			});
			toRoom(room).emit('message', {
				name: 'server',
				message: `${socket.proto.id} has joined`
			});
			socket.emit('message', {
				name: 'server',
				message: `Welcome to LowChat v2! You are currently in room "${socket.proto.room}". To join a different room, type /join [room]. Type /help to see more commands`
			});

			if (query({
					room: room
				}).length === 1 && socket.proto.room !== 'main') {
				socket.proto.admin = true;
				toRoom(socket.proto.room).emit('message', {
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
		// let sockets = io.of('/').in(socket.proto.room).sockets;
		let sockets = query({
			room: socket.proto.room
		});
		let allsockets = io.of('/').sockets;
		let room = socket.proto.room;
		defaults(sockets, true);
		message = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
		if (message && !socket.proto.muted) {
			if (message[0] === '/') {
				let newname;
				let selectedSocket;
				let rooms;
				switch (message.split(' ')[0]) {
					case '/whois':
						selectedSocket = query({
							name: message.split(' ')[1],
							id: message.split(' ')[1]
						});
						selectedSocket = query({
							room: room
						}, false, selectedSocket);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						rooms = queryKeys({
							name: message.split(' ')[1],
							id: message.split(' ')[1]
						}).map(el => allsockets[el].proto.room);
						if (selectedSocket) {
							socket.emit('message', {
								name: 'server',
								message: `<br>${selectedSocket.proto.id} is ${selectedSocket.proto.name}<br>
								${selectedSocket.proto.name} is in ${rooms.length} room${rooms.length > 1 ? 's' : ''}: ${rooms.join(', ')}<br>
								Online for: ${formatHMS(new Date() - selectedSocket.proto.created)}<br>
								Admin: ${selectedSocket.proto.admin}`
							});
						} else if (message.split(' ')[1] && message.split(' ')[1].indexOf('#') === 0) {
							selectedSocket = query({
								room: message.split(' ')[1].substr(1)
							});
							rooms = Object.keys(selectedSocket).map(el => selectedSocket[el].proto.name);
							socket.emit('message', {
								name: 'server',
								message: `${message.split(' ')[1]} has ${rooms.length} user${rooms.length > 1 ? 's' : ''}: ${rooms.join(', ')}`
							});
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: User/Room ${message.split(' ')[1]} does not exist`
							});
						}
						break;
					case '/kick':
						selectedSocket = query({
							name: message.split(' ')[1],
							room: room
						}, true);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						if (socket.proto.admin) {
							if (selectedSocket) {
								selectedSocket.disconnect();
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: User ${message.split(' ')[1]} does not exist`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: Invalid credentials`
							});
						}
						break;
					case '/deop':
						selectedSocket = query({
							name: message.split(' ')[1],
							room: room
						}, true);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						if (socket.proto.admin) {
							if (selectedSocket && selectedSocket.proto.id !== socket.proto.id) {
								selectedSocket.proto.admin = false;
								selectedSocket.proto.name = selectedSocket.proto.name.replace('@', '');
								toRoom(socket.proto.room).emit('message', {
									name: 'server',
									message: `${selectedSocket.proto.name} is no longer an op`
								});
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: User ${message.split(' ')[1]} does not exist`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: Invalid credentials`
							});
						}
						break;
					case '/op':
						selectedSocket = query({
							name: message.split(' ')[1],
							room: room
						}, true);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						if (socket.proto.admin) {
							if (selectedSocket) {
								selectedSocket.proto.admin = true;
								selectedSocket.proto.name = '@' + selectedSocket.proto.name;
								toRoom(socket.proto.room).emit('message', {
									name: 'server',
									message: `${selectedSocket.proto.name} is now an op`
								});
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: User ${message.split(' ')[1]} does not exist`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: Invalid credentials`
							});
						}
						break;
					case '/unmute':
						selectedSocket = query({
							name: message.split(' ')[1],
							room: room
						}, true);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						if (socket.proto.admin) {
							if (selectedSocket) {
								selectedSocket.proto.muted = false;
								toRoom(socket.proto.room).emit('message', {
									name: 'server',
									message: `${selectedSocket.proto.name} has been unmuted`
								});
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: User ${message.split(' ')[1]} does not exist`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: Invalid credentials`
							});
						}
						break;
					case '/mute':
						selectedSocket = query({
							name: message.split(' ')[1],
							room: room
						}, true);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						if (socket.proto.admin) {
							if (selectedSocket && selectedSocket.proto.id !== socket.proto.id) {
								selectedSocket.proto.muted = true;
								toRoom(socket.proto.room).emit('message', {
									name: 'server',
									message: `${selectedSocket.proto.name} has been muted`
								});
							} else {
								socket.emit('message', {
									name: 'server',
									message: `Error: User ${message.split(' ')[1]} does not exist`
								});
							}
						} else {
							socket.emit('message', {
								name: 'server',
								message: `Error: Invalid credentials`
							});
						}
						break;
					case '/msg':
						selectedSocket = query({
							name: message.split(' ')[1],
							room: room
						}, true);
						selectedSocket = selectedSocket[Object.keys(selectedSocket)[0]];
						if (selectedSocket) {
							socket.to(selectedSocket.proto.id).emit('message', {
								name: socket.proto.name,
								message: message.split(' ').slice(2).join(' '),
								color: socket.proto.id,
								type: 'direct'
							});
							socket.emit('message', {
								name: 'server',
								message: `Message sent to ${message.split(' ')[1]}`
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
							if (!socket.proto.admin) {
								socket.proto.admin = true;
								socket.proto.name = '@' + socket.proto.name;
								toRoom(socket.proto.room).emit('message', {
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
							if (queryKeys({
									name: message.split(' ')[1],
									room: room
								}, true).length === 0 && newname !== 'server') {
								if (socket.proto.admin) {
									socket.proto.name = '@' + newname;
								} else {
									socket.proto.name = newname;
								}
								toRoom(socket.proto.room).emit('message', {
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
							message: queryKeys({
								room: room
							}).map(el => sockets[el].proto.name).join(', ').replace(socket.proto.name, '<b>$&</b>')
						});
						break;
					case '/rooms':
						rooms = occurences(Object.keys(allsockets).map(el => allsockets[el].proto.room));
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
				toRoom(socket.proto.room).emit('message', {
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

function toRoom(room) {
	return {
		emit: (type, data) => {
			let sockets = queryKeys({room: room});
			for (let i in sockets) {
				io.to(sockets[i]).emit(type, data);
			}
		}
	}
}

function formatHMS(time) {
	let hours = Math.floor(time / 1000 / 60 / 60);
	let minutes = Math.floor(time / 1000 / 60) % 60;
	let seconds = Math.floor(time / 1000) % 60;
	return `${hours}h:${minutes < 10 ? '0' + minutes : minutes}m:${seconds < 10 ? '0' + seconds : seconds}s`;
}