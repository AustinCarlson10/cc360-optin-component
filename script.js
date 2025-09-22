(function() {
	'use strict';

	function isValidEmail(value) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).toLowerCase());
	}

	function initTheme() {
		const savedTheme = localStorage.getItem('theme');
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		
		// Use saved theme, fallback to system preference, then dark
		const theme = savedTheme || (prefersDark ? 'dark' : 'light');
		console.log('Initializing theme:', theme, 'saved:', savedTheme, 'prefers:', prefersDark);
		
		document.body.className = `theme-${theme}`;
		
		// Update toggle button state
		updateThemeToggle(theme);
	}

	function updateThemeToggle(theme) {
		const toggle = document.getElementById('themeToggle');
		if (toggle) {
			toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
			console.log('Theme toggle updated for:', theme);
		} else {
			console.error('Theme toggle button not found!');
		}
	}

	function toggleTheme() {
		const body = document.body;
		const isDark = body.classList.contains('theme-dark');
		const newTheme = isDark ? 'light' : 'dark';
		
		console.log('Toggling theme from', isDark ? 'dark' : 'light', 'to', newTheme);
		
		body.className = `theme-${newTheme}`;
		localStorage.setItem('theme', newTheme);
		updateThemeToggle(newTheme);
		
		// Force a repaint to ensure theme change is visible
		body.style.display = 'none';
		body.offsetHeight; // Trigger reflow
		body.style.display = '';
	}

	function smoothScrollTo(hash) {
		try {
			const target = document.querySelector(hash);
			if (!target) return;
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
		} catch (e) {
			console.warn('Smooth scroll failed for', hash, e);
		}
	}

	function initNav() {
		const toggle = document.getElementById('navToggle');
		const list = document.getElementById('primaryNav');
		if (!toggle || !list) return;
		
		toggle.addEventListener('click', function() {
			const isOpen = list.classList.toggle('is-open');
			toggle.setAttribute('aria-expanded', String(isOpen));
		});

		list.addEventListener('click', function(e) {
			const target = e.target;
			if (target && target.tagName === 'A') {
				list.classList.remove('is-open');
				toggle.setAttribute('aria-expanded', 'false');
			}
		});

		document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
			anchor.addEventListener('click', function(e) {
				const href = anchor.getAttribute('href');
				if (!href || href.length < 2) return;
				if (href.startsWith('#')) {
					e.preventDefault();
					smoothScrollTo(href);
				}
			});
		});
	}

	function initTestimonials() {
		var items = Array.prototype.slice.call(document.querySelectorAll('.testimonial'));
		if (!items.length) return;
		var current = Math.max(0, items.findIndex(function(el){ return el.classList.contains('is-active'); }));
		if (current === -1) current = 0;

		function show(idx) {
			items.forEach(function(el){ el.classList.remove('is-active'); });
			items[idx].classList.add('is-active');
			current = idx;
		}

		function prev() { show((current - 1 + items.length) % items.length); }
		function next() { show((current + 1) % items.length); }

		var prevBtn = document.getElementById('prevTestimonial');
		var nextBtn = document.getElementById('nextTestimonial');
		if (prevBtn) prevBtn.addEventListener('click', function(){ prev(); });
		if (nextBtn) nextBtn.addEventListener('click', function(){ next(); });

		var auto = setInterval(next, 6000);
		var container = document.querySelector('.testimonials');
		if (container) {
			container.addEventListener('mouseenter', function(){ clearInterval(auto); });
			container.addEventListener('mouseleave', function(){ auto = setInterval(next, 6000); });
		}
	}

	function formatPhone(value) {
		var digits = (value || '').replace(/\D/g, '').slice(0, 10);
		var part1 = digits.slice(0, 3);
		var part2 = digits.slice(3, 6);
		var part3 = digits.slice(6, 10);
		if (digits.length > 6) return '(' + part1 + ') ' + part2 + '-' + part3;
		if (digits.length > 3) return '(' + part1 + ') ' + part2;
		if (digits.length > 0) return '(' + part1;
		return '';
	}

	function initQuoteForm() {
		var form = document.getElementById('quoteForm');
		if (!form) return;
		var name = document.getElementById('name');
		var email = document.getElementById('email');
		var phone = document.getElementById('phone');
		var type = document.getElementById('type');
		var message = document.getElementById('quoteMessage');
		var submit = document.getElementById('submitQuote');

		if (phone) {
			phone.addEventListener('input', function() {
				var start = phone.selectionStart;
				var end = phone.selectionEnd;
				var formatted = formatPhone(phone.value);
				phone.value = formatted;
				phone.setSelectionRange(formatted.length, formatted.length);
			});
		}

		form.addEventListener('submit', function(e) {
			e.preventDefault();
			var errors = [];
			if (!name.value.trim()) errors.push('Please enter your name.');
			if (!isValidEmail(email.value)) errors.push('Please enter a valid email.');
			if ((phone.value || '').replace(/\D/g, '').length < 10) errors.push('Please enter a valid phone number.');
			if (!type.value) errors.push('Please select a project type.');

			if (errors.length) {
				message.textContent = errors[0];
				message.style.color = '#ff6b6b';
				return;
			}

			submit.disabled = true;
			submit.textContent = 'Submitting…';

			setTimeout(function() {
				submit.disabled = false;
				submit.textContent = 'Submit Request';
				message.textContent = 'Thanks! We\'ll contact you shortly to schedule your quote.';
				message.style.color = '';
				form.reset();
			}, 900);
		});
	}

	document.addEventListener('DOMContentLoaded', function() {
		console.log('DOM loaded, initializing theme system...');
		
		// Initialize theme
		initTheme();

		// Theme toggle
		const themeToggle = document.getElementById('themeToggle');
		if (themeToggle) {
			console.log('Theme toggle button found, adding click listener');
			themeToggle.addEventListener('click', toggleTheme);
			
			// Also add touch events for mobile
			themeToggle.addEventListener('touchstart', function(e) {
				e.preventDefault();
				toggleTheme();
			});
		} else {
			console.error('Theme toggle button not found in DOM!');
		}

		// Mobile navigation and smooth scroll
		initNav();

		// Testimonials carousel
		initTestimonials();

		// Quote form
		initQuoteForm();

		// Footer year
		var year = document.getElementById('year');
		if (year) year.textContent = String(new Date().getFullYear());
	});
})(); 