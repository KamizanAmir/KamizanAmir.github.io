document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Mobile Menu Toggle (Keep existing) ---
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // --- 2. INFINITE CAROUSEL LOGIC (UPDATED) ---
    const track = document.querySelector('.carousel-track');
    const cards = document.querySelectorAll('.carousel-card');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (track && cards.length > 0) {
        const originalCount = cards.length;

        // Determine how many items are visible at once
        const getVisibleItems = () => window.innerWidth <= 768 ? 1 : 3;
        let visibleItems = getVisibleItems();
        let cardWidth = 100 / visibleItems;
        let index = 0;
        let isTransitioning = false;

        // CLONE cards to create the infinite illusion
        // We clone the first 'visibleItems' set and append to end
        for (let i = 0; i < visibleItems; i++) {
            const clone = cards[i].cloneNode(true);
            clone.classList.add('clone');
            track.appendChild(clone);
        }

        const updateCarousel = (useTransition = true) => {
            isTransitioning = true; // Lock buttons during move
            if (useTransition) {
                track.style.transition = 'transform 0.5s ease-in-out';
            } else {
                track.style.transition = 'none'; // Instant jump
            }
            track.style.transform = `translateX(-${index * cardWidth}%)`;
        };

        const handleNext = () => {
            if (isTransitioning) return;
            index++;
            updateCarousel();
        };

        const handlePrev = () => {
            if (isTransitioning) return;
            if (index === 0) {
                // If at start, jump instantly to the end (before moving) is tricky
                // Simplest strategy for prev button at 0:
                // Stop the loop, or just don't allow going left from 0 in this simple implementation
                // OR: Flash to the clone spot. 
                // For robustness in this specific script, we will simply loop logic:
                index = originalCount - 1;
                updateCarousel(false); // Jump instantly
                setTimeout(() => {
                    index--;
                    updateCarousel(true); // Then slide
                }, 10);
                return;
            }
            index--;
            updateCarousel();
        };

        nextBtn.addEventListener('click', () => {
            handleNext();
            resetAutoScroll();
        });

        prevBtn.addEventListener('click', () => {
            handlePrev();
            resetAutoScroll();
        });

        // DETECT END OF TRANSITION
        track.addEventListener('transitionend', () => {
            isTransitioning = false;

            // Check if we have scrolled into the CLONES
            if (index >= originalCount) {
                // We are visually at the clone (which looks like slide 1)
                // Instantly snap back to the REAL slide 1 (index 0)
                index = 0;
                track.style.transition = 'none';
                track.style.transform = `translateX(0)`;
            }
        });

        // Auto Scroll
        let autoScrollTimer = setInterval(handleNext, 3000);

        function resetAutoScroll() {
            clearInterval(autoScrollTimer);
            autoScrollTimer = setInterval(handleNext, 3000);
        }

        // Handle Resize (Reload to recalculate clones/width simply)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                // Determine if visible items changed, if so, reload for safety
                // or just update width
                const newVisible = getVisibleItems();
                if (newVisible !== visibleItems) {
                    window.location.reload();
                } else {
                    cardWidth = 100 / visibleItems;
                    updateCarousel(false);
                }
            }, 200);
        });
    }

    // --- 3. Scroll To Top Button (Keep existing) ---
    const scrollBtn = document.getElementById('scrollToTop');
    if (scrollBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) scrollBtn.classList.add('show');
            else scrollBtn.classList.remove('show');
        });
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});