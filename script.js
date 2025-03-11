document.addEventListener("DOMContentLoaded", function () {
  // Initialize all features
  initNavigation();
  initTypingEffect();
  initScrollAnimations();
  
  // Adjust header size on scroll
  window.addEventListener("scroll", adjustHeaderSize);
  
  // Run initial header adjustment
  adjustHeaderSize();
});

// Modern navigation with smooth scroll
function initNavigation() {
  // Create navigation menu items based on sections
  const sections = document.querySelectorAll('section');
  const navList = document.querySelector('header nav ul');
  
  // Clear existing nav items
  navList.innerHTML = '';
  
  // Build new navigation from sections
  sections.forEach(section => {
    if (section.id) {
      const listItem = document.createElement('li');
      listItem.classList.add('nav-item');
      listItem.innerHTML = `<a href="#${section.id}" data-section="${section.id}">${section.querySelector('h2').textContent}</a>`;
      navList.appendChild(listItem);
      
      // Add glow effect on hover
      listItem.addEventListener('mouseenter', () => {
        listItem.classList.add('glow-effect');
      });
      
      listItem.addEventListener('mouseleave', () => {
        listItem.classList.remove('glow-effect');
      });
    }
  });
  
  // Add smooth scrolling to all navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Remove active class from all links
      document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.classList.remove('active');
      });
      
      // Add active class to current link
      this.classList.add('active');
      
      // Get the target section
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        // Smooth scroll to section
        window.scrollTo({
          top: targetSection.offsetTop - 100, // Offset to account for fixed header
          behavior: 'smooth'
        });
        
        // Add animation to the target section
        targetSection.classList.add('highlight-section');
        setTimeout(() => {
          targetSection.classList.remove('highlight-section');
        }, 1000);
      }
    });
  });
  
  // Highlight current section in navigation based on scroll position
  window.addEventListener('scroll', updateActiveNavigation);
}

function updateActiveNavigation() {
  const scrollPosition = window.scrollY + 150; // Adjust for header

  document.querySelectorAll('section').forEach(section => {
    if (section.id) {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        // Remove active from all links
        document.querySelectorAll('a[href^="#"]').forEach(a => {
          a.classList.remove('active');
        });
        
        // Add active to current section link
        const currentLink = document.querySelector(`a[href="#${section.id}"]`);
        if (currentLink) {
          currentLink.classList.add('active');
        }
      }
    }
  });
}

// Typing effect for job title
function initTypingEffect() {
  const jobTitleElement = document.querySelector('.current-job');
  const originalText = jobTitleElement.textContent;
  jobTitleElement.textContent = '';
  
  // Add a cursor element
  const cursorElement = document.createElement('span');
  cursorElement.classList.add('typing-cursor');
  cursorElement.textContent = '|';
  jobTitleElement.appendChild(cursorElement);
  
  let i = 0;
  const typingSpeed = 80; // ms per character
  
  // Type out each character with a delay
  function typeCharacter() {
    if (i < originalText.length) {
      // Insert character before the cursor
      const textNode = document.createTextNode(originalText.charAt(i));
      jobTitleElement.insertBefore(textNode, cursorElement);
      i++;
      setTimeout(typeCharacter, typingSpeed);
    } else {
      // Start cursor blinking after typing is complete
      cursorElement.classList.add('blink');
    }
  }
  
  // Start typing after a short delay
  setTimeout(typeCharacter, 500);
}

// Enhanced scroll animations using Intersection Observer
function initScrollAnimations() {
  const sections = document.querySelectorAll('section');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  
  // Observer for sections
  const sectionObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        entry.target.classList.add('fade-in-up');
        // Unobserve after animation to improve performance
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null, // viewport
    threshold: 0.15, // trigger when 15% of the element is visible
    rootMargin: '-50px 0px' // offset
  });
  
  // Observer for portfolio items with staggered reveal
  const itemObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Add a delay based on the item's position for staggered animation
        setTimeout(() => {
          entry.target.classList.add('visible');
          entry.target.classList.add('scale-in');
        }, index * 150); // 150ms delay between items
        
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.1,
    rootMargin: '-30px 0px'
  });
  
  // Apply observers to elements
  sections.forEach(section => {
    sectionObserver.observe(section);
  });
  
  portfolioItems.forEach(item => {
    itemObserver.observe(item);
  });
  
  // Animate header elements with a custom observer
  const headerElements = document.querySelectorAll('.header-text h1, .header-text p, .header-text nav');
  const headerObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('header-element-visible');
        }, index * 400); // Cascade effect with 400ms delay
      }
    });
  }, {
    threshold: 0.8
  });
  
  headerElements.forEach(el => {
    headerObserver.observe(el);
  });
}

// Enhanced header size adjustment with smoother animations
function adjustHeaderSize() {
  const header = document.querySelector("header");
  const profilePicture = document.querySelector(".profile-picture");
  const scrollTop = window.scrollY;
  const headerFullHeight = 60; // vh
  const headerShrunkHeight = 20; // vh
  
  // Add transition class if not already present to enable smooth animations
  if (!header.classList.contains('header-transition')) {
    header.classList.add('header-transition');
    profilePicture.classList.add('header-transition');
  }

  if (scrollTop > window.innerHeight * (headerFullHeight / 100)) {
    header.style.height = `${headerShrunkHeight}vh`;
    header.classList.add('header-scrolled');
    profilePicture.style.width = "80px";
    profilePicture.style.height = "80px";
    profilePicture.classList.add('profile-scrolled');
    
    // Adjust the position and scale of elements inside header when scrolled
    document.querySelectorAll('.header-text h1, .header-text p').forEach(el => {
      el.classList.add('text-scrolled');
    });
    
    // push the main content below the new header height
    document.querySelector("main").style.marginTop = `${headerShrunkHeight}vh`;
  } else {
    header.style.height = `${headerFullHeight}vh`;
    header.classList.remove('header-scrolled');
    profilePicture.style.width = "150px";
    profilePicture.style.height = "150px";
    profilePicture.classList.remove('profile-scrolled');
    
    // Reset elements inside header when at top
    document.querySelectorAll('.header-text h1, .header-text p').forEach(el => {
      el.classList.remove('text-scrolled');
    });
    
    document.querySelector("main").style.marginTop = `${headerFullHeight}vh`;
  }
  
  // Update active navigation based on scroll position
  updateActiveNavigation();
}
