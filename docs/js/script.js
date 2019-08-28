var client;
var user = window.location.href.split('/');
var room = window.location.href.split('/');
var id = '';
user = user[user.length - 1];
room = room[room.length - 2];


$(document).ready(function () {
	client = io.connect('http://v14server.ml:5500');

	client.on('connect', function () {
		let template = $('#message').attr('placeholder')
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
	});

	client.on('message', function (data) {
		let template = $('#lineTemplate').html();
		template = template.replace('{{user}}', data.user);
		template = template.replace('{{message}}', data.message);
		template = template.replace(new RegExp('@' + user), '<b class="mention">$&</b>');
		$('.history').append(template);
		$(".history").animate({
			scrollTop: $('.history')[0].scrollHeight
		}, 500);
	});

	client.on('server', function (data) {
		let template = $('#serverLineTemplate').html();
		template = template.replace('{{message}}', data);
		template = template.replace(new RegExp('@' + user), '<b class="mention">$&</b>');
		$('.history').append(template);
		$(".history").animate({
			scrollTop: $('.history')[0].scrollHeight
		}, 500);
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
	client.emit('message', {
		user: user,
		message: message,
		id: id
	});
	let template = $('#lineTemplate').html();
	template = template.replace('{{user}}', user);
	template = template.replace('{{message}}', message);
	template = template.replace(new RegExp('@' + user), '<b class="mention">$&</b>');
	$('.history').append(template);
	$(".history").animate({
		scrollTop: $('.history')[0].scrollHeight
	}, 500);
}