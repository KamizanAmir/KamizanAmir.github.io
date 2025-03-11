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
  const scrollTop = window.scrollY;

  // Only run the resizing on desktops/tablets
  if (window.innerWidth > 768) {
    const headerHeight = header.offsetHeight;
    if (scrollTop > headerHeight) {
      header.style.height = '20vh';
      profilePicture.style.width = '80px';
      profilePicture.style.height = '80px';
    } else {
      header.style.height = '60vh';
      profilePicture.style.width = '150px';
      profilePicture.style.height = '150px';
    }
  } else {
    // On mobile, just let the CSS "auto" height take over
    header.style.height = 'auto';
    profilePicture.style.width = '100px';
    profilePicture.style.height = '100px';
  }
}

// Portfolio Filtering
document.addEventListener('DOMContentLoaded', function() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const portfolioItems = document.querySelectorAll('.portfolio-item');
  
  // Add click event to filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Remove active class from all buttons
      filterBtns.forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Get filter value
      const filterValue = this.getAttribute('data-filter');
      
      // Filter portfolio items
      portfolioItems.forEach(item => {
        // Remove hide and show classes first
        item.classList.remove('hide');
        item.classList.remove('show');
        
        // Add appropriate class based on filter
        if (filterValue === 'all') {
          item.classList.add('show');
        } else if (item.classList.contains(filterValue)) {
          item.classList.add('show');
        } else {
          item.classList.add('hide');
        }
      });
    });
  });
  
  // Set all items to show initially
  portfolioItems.forEach(item => {
    item.classList.add('show');
  });
});

// Add CSS for animations to the head
document.addEventListener('DOMContentLoaded', function() {
  const style = document.createElement('style');
  style.textContent = `
    .portfolio-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    
    .portfolio-filter {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      margin-bottom: 30px;
      gap: 10px;
    }
    
    .filter-btn {
      background-color: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 8px 16px;
      border-radius: 30px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .filter-btn:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
    
    .filter-btn.active {
      background-color: #f5a623;
      color: #000;
    }
    
    .portfolio-item {
      opacity: 0;
      transform: scale(0.8);
      transition: opacity 0.5s ease, transform 0.5s ease;
      overflow: hidden;
    }
    
    .portfolio-item.show {
      opacity: 1;
      transform: scale(1);
      height: auto;
    }
    
    .portfolio-item.hide {
      opacity: 0;
      transform: scale(0.8);
      height: 0;
      margin: 0;
      padding: 0;
      position: absolute;
    }
    
    @media (max-width: 768px) {
      .portfolio-grid {
        grid-template-columns: 1fr;
      }
      
      .filter-btn {
        font-size: 14px;
        padding: 6px 12px;
      }
    }
  `;
  document.head.appendChild(style);
});
