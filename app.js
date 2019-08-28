/* jshint esversion: 6 */
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

var db = {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(express.static('docs'));

http.listen(3000, function () {
	console.log('listening on *:3000');
});

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/docs/index.html');
});

app.get('/:room/:user', (req, res) => {
	let room = req.params.room;
	let user = req.params.user;
	if (/\W/.test(user)) {
		res.send('[LowChat] Error: Illegal characters present in username. The legal characters are "A-Z", "a-z", and "_".');
		console.log('Illegal Username');
	} else if (/\W/.test(room)) {
		res.send('[LowChat] Error: Illegal characters present in room name. The legal characters are "A-Z", "a-z", and "_".');
		console.log('Illegal Room Name');
	} else if (db[user] === undefined) { // User does not exist in entire DB
		db[user] = {
			room: room
		};
		res.sendFile(__dirname + '/docs/pages/room.html');
		console.log('New User');
	} else if (Object.keys(db).find(obj => db[obj].room === room)) { // Duplicate User
		res.send('[LowChat] Error: The user "' + user + '" already exists in the room. Please try a different username.');
		console.log('Duplicate User');
	}
	fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {
		console.log('DB Updated');
	});
});

io.on('connection', function (socket) {
	socket.on('init', function (data) {
		let user = data.user;
		let room = data.room;

		if (db[user] === undefined) {
			db[user] = {
				room: room,
				id: socket.id
			};
		} else {
			// db.find((obj) => {
			// 	if (obj.room === room) {
			// 		obj.id = socket.id;
			// 		return;
			// 	}
			// });
			Object.keys(db).find((obj) => {
				if (db[obj].room === room) {
					db[obj].id = socket.id;
					return;
				}
			});
		}
		console.log(`User ${socket.id} is now known as "${user}"`);

		fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {
			console.log('DB Updated')
		});
	});

	socket.on('disconnect', function () {
		console.log('Client Disconnected');
		Object.keys(db).find((obj) => {
			if (db[obj].id === socket.id) { // Note SocketID is unique so checking for room isn't needed
				delete db[obj];
				console.log('Deleted "' + obj + '" from the DB');
				return;
			}
		});
	})
});

function sanitize(text) {
	return text.replace(/<(?:.|\n)*>/gi, '[html]');
}