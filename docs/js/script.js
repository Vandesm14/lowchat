var client;
var user = window.location.href.split('/');
user = user[user.length - 1];

$(document).ready(function () {
	client = io.connect('http://127.0.0.1:3000');

	client.on('connect', function () {
		// client.emit('init', {user: user});
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