// script.js

document.addEventListener('DOMContentLoaded', function() {
  /* =========================
     1) Fade-in sections on scroll
     ========================= */
  const sections = document.querySelectorAll('section');
  window.addEventListener('scroll', fadeInOnScroll);

  function fadeInOnScroll() {
    const triggerBottom = window.innerHeight * 0.85;
    sections.forEach(section => {
      const sectionTop = section.getBoundingClientRect().top;
      if (sectionTop < triggerBottom) {
        section.classList.add('visible');
      }
    });
  }
  fadeInOnScroll();

  /* =========================
     2) Portfolio filtering
     ========================= */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const filterValue = this.getAttribute('data-filter');
      portfolioItems.forEach(item => {
        item.classList.remove('hide', 'show');
        if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
          item.classList.add('show');
        } else {
          item.classList.add('hide');
        }
      });
    });
  });
  // Show all items by default
  portfolioItems.forEach(item => item.classList.add('show'));

  /* =========================
     3) Scroll-to-top button behavior
     ========================= */
  const scrollBtn = document.getElementById('scrollToTop');
  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
  });
  scrollBtn.addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* =========================
     4) Contact form validation
     ========================= */
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      let valid = true;

      // Field references
      const nameField = document.getElementById('name');
      const emailField = document.getElementById('email');
      const subjectField = document.getElementById('subject');
      const messageField = document.getElementById('message');

      // Clear any previous error messages
      resetField(nameField);
      resetField(emailField);
      resetField(subjectField);
      resetField(messageField);

      // Name validation (at least 2 characters)
      if (nameField.value.trim().length < 2) {
        highlightError(nameField, 'Please enter a valid name (at least 2 characters)');
        valid = false;
      }

      // Email validation (basic regex)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailField.value.trim())) {
        highlightError(emailField, 'Please enter a valid email address');
        valid = false;
      }

      // Subject validation (at least 3 characters)
      if (subjectField.value.trim().length < 3) {
        highlightError(subjectField, 'Please enter a subject (at least 3 characters)');
        valid = false;
      }

      // Message validation (at least 10 characters)
      if (messageField.value.trim().length < 10) {
        highlightError(messageField, 'Please enter a message (at least 10 characters)');
        valid = false;
      }

      // If not valid, prevent form submission
      if (!valid) {
        e.preventDefault();
      } else {
        // Show sending state on button
        const submitBtn = contactForm.querySelector('.submit-btn');
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';
        submitBtn.disabled = true;
        // Let form submit to FormSubmit.co normally
      }
    });
  }

  /* =========================
     Helper: highlight error on a field
     ========================= */
  function highlightError(field, message) {
    // Remove any existing error message
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    // Style field with error
    field.style.borderColor = 'var(--red-error)';
    field.style.backgroundColor = 'rgba(255, 77, 77, 0.05)';

    // Create error message div
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    field.parentNode.appendChild(errorDiv);

    // Shake animation for field
    field.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
    field.addEventListener('animationend', function() {
      field.style.animation = '';
    });
  }

  /* =========================
     Helper: reset field to normal state
     ========================= */
  function resetField(field) {
    field.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    field.style.backgroundColor = 'var(--bg-darker)';
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
  }
});
