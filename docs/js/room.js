$(document).ready(function () {
	$('#message').on('keydown', function (e) {
		if (e.key === 'Enter') {
			if ($('.app').data('page') === '') {
				console.log('true');
				window.location.href += '/' + $('#message').val();
			} else {
				window.location.href += $('#message').val();
			}
		}
	});
	$(document).on("keypress",function (e){
		$("#message").focus()
	})
	var typed = new Typed('#typed', {
		stringsElement: '#typed-strings',
		loop: false,
		showCursor: false
	});
});
