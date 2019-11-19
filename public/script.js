var client = io();
var room = window.location.pathname;
var key = false;

var chathistory = [];
var index = 0;

$(document).ready(function () {
	$('.message').focus();

	client.emit('join', room);
	client.on('message', function (data) {
		let template = $('#itemTemplate').html();
		let message = data.message.replace(/http(s)*:\/\/[^\s]*/g, '<a href="$&">$&</a>');
		let color = data.color || data.name;
		template = template.replace('{{name}}', data.name);
		template = template.replace('{{message}}', message);
		template = template.replace('{{color}}', color);
		$('.log').append(template);
		$('.log .item-name').each(function () {
			$(this).css('color', '#' + $(this).data('color'));
			if ($(this).text().match('@')) {
				$(this).css('color', 'red');
			} else if ($(this).text() === 'server') {
				if (!$(this).parent().hasClass('server')) {
					$(this).parent().addClass('server');
				}
				$(this).text(' * ');
			}
		});
		$('.log').scrollTop($('.log').height());
	});

	$('#message').on('keydown', function (e) {
		let message = $(this).text();
		if (e.keyCode === 13 && !e.shiftKey) {
			e.preventDefault();
			$(this).text('');
			if (message.indexOf('/join') === 0) {
				window.location.pathname = '/' + message.split(' ')[1];
			} else {
				client.emit('message', { message });
				chathistory.unshift(message);
				index = 0;
			}
		} else if (e.keyCode === 38) {
			e.preventDefault();
			$(this).text(chathistory[index]);
			index = (index + 1) % chathistory.length;
		} else if (e.keyCode === 40) {
			e.preventDefault();
			$(this).text(chathistory[index]);
			index = index - 1 < 0 ? 0 : index - 1;
		}
	});
});