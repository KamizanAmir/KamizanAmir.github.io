document.addEventListener('DOMContentLoaded', function() {
  // Adjust header size on scroll
  window.addEventListener('scroll', adjustHeaderSize);

  // Fade-in sections on scroll
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

  // Ensure we run once on load to handle any sections in initial view
  fadeInOnScroll();
});

function adjustHeaderSize() {
  const header = document.querySelector('header');
  const profilePicture = document.querySelector('.profile-picture');
  const headerHeight = header.offsetHeight;
  const scrollTop = window.scrollY;

  if (scrollTop > headerHeight) {
    header.style.height = '20vh';
    profilePicture.style.width = '80px';
    profilePicture.style.height = '80px';
  } else {
    header.style.height = '60vh';
    profilePicture.style.width = '150px';
    profilePicture.style.height = '150px';
  }
}
