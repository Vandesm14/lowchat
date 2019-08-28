/* jshint esversion: 6 */
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const camelCase = require('camelcase');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

io.engine.generateId = function (req) {
	return randID();
};

var db = {};

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
	if (/\W/.test(user)) {
		res.send('[LowChat] Error: Illegal characters present in username. The legal characters are "A-Z", "a-z", and "_".');
		// console.log('Illegal Username');
	} else if (/\W/.test(room)) {
		res.send('[LowChat] Error: Illegal characters present in room name. The legal characters are "A-Z", "a-z", and "_".');
		// console.log('Illegal Room Name');
	} else if (db[user] === undefined) { // User does not exist in entire DB
		db[user] = {
			room: room
		};
		res.sendFile(__dirname + '/docs/pages/app.html');
		// console.log('New User');
	} else if (Object.keys(db).find(obj => db[obj].room === room)) { // Duplicate User
		res.send('[LowChat] Error: The user "' + user + '" already exists in the room. Please try a different username.');
		// console.log('Duplicate User');
	}
	fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {});
});

io.on('connection', function (socket) {
	socket.on('init', function (data) {
		let user = data.user;
		let room = data.room;

		socket.join(room);
		socket.emit('init-back', randID());
		socket.to(room).emit('server', `User ${user} has joined the channel`);

		if (db[user] === undefined) { // User doesn't already exist, add ID
			db[user] = {
				room: room,
				id: socket.id
			};
		} else {
			Object.keys(db).find((obj) => { // User exists, add ID
				if (db[obj].room === room) {
					db[obj].id = socket.id;
					return;
				}
			});
		}
		console.log(`User ${socket.id} is now known as "${user}"`);
		fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {});
	});

	socket.on('message', function (data) {
		Object.keys(db).find((obj) => {
			if (db[obj].id === socket.id && obj === data.user) { // Note SocketID is unique so checking for room isn't needed
				socket.to(db[obj].room).emit('message', {
					user: data.user,
					message: sanitize(data.message)
				});
				return;
			}
		});
	});

	socket.on('disconnect', function () {
		// console.log('Client Disconnected');
		Object.keys(db).find((obj) => {
			if (db[obj].id === socket.id) { // Note SocketID is unique so checking for room isn't needed
				socket.to(db[obj].room).emit('server', `User ${obj} has left the channel`);
				delete db[obj];
				// console.log('Deleted "' + obj + '" from the DB');
				return;
			}
		});
		fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {});
	});
});

function sanitize(text) {
	return text.replace(/<(?:.|\n)*>/gi, '[html]');
}

function randID() {
	return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
}