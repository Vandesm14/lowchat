/* jshint esversion: 6 */
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const camelCase = require('camelcase'); // NOTE: Unused

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

fs.writeFile('db.json', '', 'utf8', () => {});

io.engine.generateId = function (req) {
	return randID();
};

var db = {
	users: {},
	rooms: {}
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(express.static('docs'));

http.listen(5500, function () {
	console.log('listening on *:5500');
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/docs/index.html');
});

app.get('/:room/', (req, res) => {
	res.sendFile(__dirname + '/docs/pages/room.html');
});

app.get('/:room/:user', (req, res) => {
	let room = req.params.room;
	let user = req.params.user;
	let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	ip = ip.replace('::ffff:', '');

	if (/\W/.test(user)) { // Illegal Username
		res.send('[LowChat] Error: Illegal characters present in username. The legal characters are "A-Z", "a-z", and "_".');
	} else if (/\W/.test(room)) { // Illegal Username
		res.send('[LowChat] Error: Illegal characters present in room name. The legal characters are "A-Z", "a-z", and "_".');
	} else if (db.users[user] === undefined) { // New User
		// CHANGE: Removed redundant DB update (same update is on socket connect/init)
		res.sendFile(__dirname + '/docs/pages/app.html');
	} else if (Object.keys(db.users).find(obj => db.users[obj].room === room)) { // Duplicate User
		res.send('[LowChat] Error: The user "' + user + '" already exists in the room. Please try a different username.<br>If you think this is a mistake, refresh the page again.');
	}
	fs.writeFile('db.json', JSON.stringify(db.users), 'utf8', () => {});
});

io.on('connection', function (socket) {
	socket.on('init', function (data) {
		let user = data.user;
		let room = data.room;
		let ip = (socket.handshake.headers["x-real-ip"] || socket.conn.remoteAddress).replace('::ffff:', '');

		socket.join(room);
		socket.emit('init-back', randID());
		socket.to(room).emit('server', `User ${user} has joined the channel`);

		if (db.users[user] === undefined) { // User doesn't already exist, add ID
			db.users[user] = {
				room: room,
				id: socket.id,
				ip: ip
			};
		} else {
			Object.keys(db.users).find((obj) => { // User exists, add ID
				if (db.users[obj].room === room && obj === user) {
					db.users[obj].id = socket.id;
					db.users[obj].ip = ip;
					return;
				}
			});
		}
		console.log(`User ${socket.id} is now known as "${user}"`);
		fs.writeFile('db.json', JSON.stringify(db.users), 'utf8', () => {});
	});

	socket.on('message', function (data) {
		let ip = (socket.handshake.headers["x-real-ip"] || socket.conn.remoteAddress).replace('::ffff:', '');
		let room;
		Object.keys(db.users).find((obj) => {
			if (db.users[obj].id === socket.id && db.users[obj] === data.user) { // Note SocketID is unique so checking for room isn't needed
				room = db.users[obj].room;
				return;
			}
		});
		if (data.message[0] === '/') {
			switch (data.message.split(' ')[0]) {
				case '/users':
					let message = [];
					Object.keys(db.users).find((obj) => {
						if (obj.room === room) {
							message.push(obj);
						}
					});
					socket.emit('server', message.join(', '));
					break;
			}
		} else {
			Object.keys(db.users).find((obj) => {
				if (db.users[obj].id === socket.id && obj === data.user) { // Note SocketID is unique so checking for room isn't needed
					socket.to(db.users[obj].room).emit('message', {
						user: data.user,
						message: sanitize(data.message)
					});
					return;
				}
			});
		}
	});

	socket.on('disconnect', function () {
		let ip = (socket.handshake.headers["x-real-ip"] || socket.conn.remoteAddress).replace('::ffff:', '');
		Object.keys(db.users).find((obj) => {
			if (db.users[obj].id === socket.id) { // Note SocketID is unique so checking for room isn't needed
				socket.to(db.users[obj].room).emit('server', `User ${obj} has left the channel`);
				delete db.users[obj];
				console.log(`User ${socket.id} (${obj}) has disconnected`);
				return;
			}
		});
		fs.writeFile('db.json', JSON.stringify(db.users), 'utf8', () => {});
	});
});

function sanitize(text) {
	return text.replace(/<(?:.|\n)*>/gi, '[html]');
}

function randID() {
	return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}