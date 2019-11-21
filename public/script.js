var client = io();
var room = window.location.pathname === '/' ? 'main' : window.location.pathname;
var key = false;

var chathistory = [];
var index = 0;

var chatlog = {};
var lasttime = new Date();

var version = '1.0.1';
var unread = 0;
var focus = true;

$(document).ready(function () {
	$('.message').focus();

	if (localStorage.getItem('chatlog') && localStorage.getItem('version') === version) {
		chatlog = JSON.parse(localStorage.getItem('chatlog'));
		parseChatLog();
	} else {
		localStorage.setItem('version', version);
	}

	client.emit('join', room);
	client.on('bounce', function (data) {
		switch (data.type) {
			case 'join':
				if (localStorage.getItem('username')) {
					client.emit('message', { message: `/nick ${localStorage.getItem('username')}` });
				}
				document.title = `LowChat | ${room}`;
				break;
		}
	});

	client.on('message', function (data) {
		data.time = formatDate(new Date());
		appendLog(data);
		if (!focus) {
			unread++;
			document.title = `LowChat | ${room} (${unread})`;
		}
	});

	$('#message').on('keydown', function (e) {
		let message = $(this).text();
		if (e.keyCode === 13 && !e.shiftKey) {
			e.preventDefault();
			$(this).text('');
			if (message.indexOf('/join') === 0) {
				window.location.pathname = '/' + message.split(' ')[1];
			} else if (message.indexOf('/clearlog') === 0) {
				chatlog[room] = [];
				localStorage.setItem('chatlog', JSON.stringify(chatlog));
				location.reload();
			} else if (message.indexOf('/clearname') === 0) {
				localStorage.removeItem('username');
			} else {
				if (message.indexOf('/nick') === 0) {
					localStorage.setItem('username', message.split(' ')[1]);
				}
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

function parseChatLog() {
	if (chatlog) {
		for (let i in chatlog[room]) {
			appendLog(chatlog[room][i], true);
		}
		appendLog({ name: '', message: '====== CACHE ======', color: 'white', time: formatDate(new Date()) }, true);
	}
}

function appendLog(data, avoid) {
	let logdiv = document.getElementById('log');
	let template = $('#itemTemplate').html();
	let message = data.message.replace(/http(s)*:\/\/[^\s]*/g, '<a href="$&">$&</a>');
	let color = data.color || data.name;
	let time = data.time;
	let type = 'n';
	if (data.name === 'server') {
		template = template.replace('{{type}}', 'server');
		data.name = ' * ';
		avoid = true;
	} else if (data.type && data.type === 'direct') {
		template = template.replace('{{type}}', 'pm');
		avoid = true;
	}
	template = template.replace('{{name}}', data.name);
	template = template.replace('{{message}}', message);
	template = template.replace('{{color}}', color);
	template = template.replace('{{time}}', time);
	$('.log').append(template);
	$('.log .item-name').each(function () {
		$(this).css('color', '#' + $(this).data('color'));
		if ($(this).text().match('@')) {
			$(this).css('color', 'red');
		}
	});
	logdiv.scrollTop = logdiv.scrollHeight;
	if (!avoid) {
		if (!chatlog[room]) {
			chatlog[room] = [];
		}
		chatlog[room].push(data);
		localStorage.setItem('chatlog', JSON.stringify(chatlog));
	}
}

function formatDate(date) {
	date = date.toLocaleTimeString();
	return `${date.split(':')[0]}:${date.split(':')[1]} ${date.split(':')[2].split(' ')[1]}`;
}

$(window).focus(function () {
	focus = true;
	unread = 0;
	document.title = 'LowChat | ' + room;
}).blur(function () {
	focus = false;
});