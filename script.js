(function() {
	'use strict';

	function isValidEmail(value) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());
	}

	document.addEventListener('DOMContentLoaded', function() {
		var form = document.getElementById('optinForm');
		var email = document.getElementById('email');
		var message = document.getElementById('message');
		var button = document.getElementById('submitBtn');

		if (!form) return;

		form.addEventListener('submit', function(e) {
			e.preventDefault();
			var value = (email.value || '').trim();

			if (!isValidEmail(value)) {
				message.textContent = 'Please enter a valid email address.';
				message.style.color = '#ff6b6b';
				email.focus();
				return;
			}

			button.disabled = true;
			button.textContent = 'Submitting…';

			// Simulate async submission
			setTimeout(function() {
				button.disabled = false;
				button.textContent = 'Submit';
				message.textContent = 'Thanks! You\'re in. Check your inbox for confirmation.';
				message.style.color = '#b6bdc7';
				form.reset();
			}, 700);
		});
	});
})(); 