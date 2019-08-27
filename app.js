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

	if (db[room] === undefined) { // Create Room
		db[room] = [{
			user: user
		}];
		res.sendFile(__dirname + '/docs/pages/room.html');
		console.log('Room Created');
	} else if (db[room].find(obj => obj.user === user)) { // Duplicate User
		res.send('[LowChat] Error: The user "' + user + '" already exists in the room. Please try a different username.');
		console.log('Duplicate User');
	} else { // Normal Entry
		db[room].push({
			user: user
		});
		res.sendFile(__dirname + '/docs/pages/room.html');
		console.log('Normal Entry');
	}
	fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {
		console.log('DB Updated')
	});
});

io.on('connection', function (socket) {
	socket.on('init', function (data) {
		let user = data.user;
		console.log(`User ${socket.id} is now known as "${user}"`);
		fs.writeFile('db.json', JSON.stringify(db), 'utf8', () => {
			console.log('DB Updated')
		});
		db[room].find((obj) => {
			if (obj.user === user) {
				obj.id = socket.id;
				return;
			}
		});
	});

	socket.on('disconnect', function () {
		console.log('Client Disconnected');
		
	})
});