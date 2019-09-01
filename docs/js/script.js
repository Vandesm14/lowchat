/* jshint esversion: 6 */
var client;
var user = window.location.href.split('/');
var room = window.location.href.split('/');
var id = '';
var cmd = ['/users', '/share'];
var url = window.location.host;

user = user[user.length - 1];
room = room[room.length - 2];

$(document).ready(function () {
	client = io.connect(url);

	client.on('connect', function () {
		let template = $('#message').attr('placeholder');
		template = template.replace('{{user}}', user);
		template = template.replace('{{room}}', room);
		$('#message').attr('placeholder', template);

		client.emit('init', {
			user: user,
			room: room
		});
	});

	client.on('init-back', function (data) {
		id = data;
		console.log('Your id is: ' + id);
	});

	client.on('message', function (data) {
		logMessageAsUser(data);
	});

	client.on('server', function (data) {
		logMessageAsServer(data);
	});

	$('#message').on('keydown', function (e) {
		if (e.key === 'Enter') {
			sendMessage($(this));
		}
	});
});

function sendMessage(elem) {
	let message = elem.val();
	elem.val('');

	if (message === '') {
		return;
	} else if (message[0] === '/') {
		switch (message.split(' ')[0]) {
			case '/users':
				client.emit('message', {
					user: user,
					message: message,
					id: id
				});
				break;
			case '/share':
				logMessageAsServer(`Share URL: <a href="${url}/${room}">${url}/${room}</a>`);
				break;
			case '/help':
				logMessageAsServer('Commands: ' + cmd.join(', '));
				break;
			default:
				logMessageAsServer('Client: Command Error');
		}
	} else {
		logMessageAsCurrent(message);
		client.emit('message', {
			user: user,
			message: message
		});
	}
}

function shareRoom() {
	let copy = document.getElementById("myInput");
	copy.select();
	copy.setSelectionRange(0, copy.value.length);
	document.execCommand("copy");
}

function logMessageAsCurrent(message) {
	let template = $('#lineTemplate').html();
	template = template.replace('{{user}}', user);
	template = template.replace('{{message}}', message);
	template = template.replace(new RegExp('@' + user), '<b class="mention">$&</b>');
	$('.history').append(template);
	$(".history").animate({
		scrollTop: $('.history')[0].scrollHeight
	}, 500);

}

function logMessageAsUser(data) {
	let template = $('#lineTemplate').html();
	template = template.replace('{{user}}', data.user);
	template = template.replace('{{message}}', data.message);
	template = template.replace(new RegExp('@' + user), '<b class="mention">$&</b>');
	$('.history').append(template);
	$(".history").animate({
		scrollTop: $('.history')[0].scrollHeight
	}, 500);
}

function logMessageAsServer(data) {
	let template = $('#serverLineTemplate').html();
	template = template.replace('{{message}}', data);
	template = template.replace(new RegExp('@' + user), '<b class="mention">$&</b>');
	$('.history').append(template);
	$(".history").animate({
		scrollTop: $('.history')[0].scrollHeight
	}, 500);
}