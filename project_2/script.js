document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // --- 2. Carousel Logic ---
    const track = document.querySelector('.carousel-track');
    const cards = document.querySelectorAll('.carousel-card');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (track && cards.length > 0) {
        let index = 0;
        const totalCards = cards.length;

        // Determine items to scroll based on screen size
        const getVisibleItems = () => window.innerWidth <= 768 ? 1 : 3;

        let visibleItems = getVisibleItems();
        let cardWidth = 100 / visibleItems;

        const updateCarousel = () => {
            // Check bounds
            if (index < 0) index = 0;
            if (index > totalCards - visibleItems) index = 0;

            // Move track
            track.style.transform = `translateX(-${index * cardWidth}%)`;
        };

        // Next Button
        nextBtn.addEventListener('click', () => {
            index++;
            if (index > totalCards - visibleItems) index = 0;
            updateCarousel();
            resetAutoScroll();
        });

        // Prev Button
        prevBtn.addEventListener('click', () => {
            index--;
            if (index < 0) index = totalCards - visibleItems;
            updateCarousel();
            resetAutoScroll();
        });

        // Auto Scroll
        let autoScrollTimer = setInterval(() => {
            index++;
            updateCarousel();
        }, 3000); // 3 seconds

        function resetAutoScroll() {
            clearInterval(autoScrollTimer);
            autoScrollTimer = setInterval(() => {
                index++;
                updateCarousel();
            }, 3000);
        }

        // Handle Resize
        window.addEventListener('resize', () => {
            visibleItems = getVisibleItems();
            cardWidth = 100 / visibleItems;
            index = 0; // Reset to start to avoid layout breaks
            updateCarousel();
        });
    }

    // --- 3. Scroll To Top Button ---
    const scrollBtn = document.getElementById('scrollToTop');

    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('show');
            } else {
                scrollBtn.classList.remove('show');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
});