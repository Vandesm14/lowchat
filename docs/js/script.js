var client;
var user = window.location.href.split('/');
var room = window.location.href.split('/');
user = user[user.length - 1];
room = room[room.length - 2];


$(document).ready(function () {
	client = io.connect('http://127.0.0.1:3000');

	client.on('connect', function () {
		client.emit('init', {user: user, room: room});
	});

	client.on('message', function(){});
	client.on('server', function(){});

	$('#message').on('keydown', function (e) {
		if (e.key === 'Enter') {
			sendMessage($(this));
		}
	})
});

function sendMessage(elem) {
	let message = elem.val();
	elem.val('');
	alert(message);
}