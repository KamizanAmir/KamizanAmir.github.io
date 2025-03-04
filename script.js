document.addEventListener('DOMContentLoaded', function() {
    // Grab all sections that you want to fade in
    const sections = document.querySelectorAll('section');
  
    // Run once on load
    fadeInOnScroll();
  
    // Also run on scroll
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
  });
  