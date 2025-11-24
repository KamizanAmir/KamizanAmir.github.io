// --- DOM ELEMENTS ---
const slides = document.querySelectorAll('.slide');
const dotsContainer = document.getElementById('dotsContainer');
const sliderContainer = document.querySelector('.slider-container');
const totalSlides = slides.length;
let currentSlide = 0;
let autoSlideInterval;

// --- 1. INITIALIZE DOTS ---
function createDots() {
    dotsContainer.innerHTML = ''; // Clear existing dots if any
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('dot');
        if (index === 0) dot.classList.add('active');

        // Click dot to jump to slide
        dot.addEventListener('click', () => {
            currentSlide = index;
            updateSlider();
            resetTimer(); // Reset timer so it doesn't auto-skip immediately after click
        });

        dotsContainer.appendChild(dot);
    });
}

// --- 2. CORE SLIDER LOGIC ---
function updateSlider() {
    // Handle Slides
    slides.forEach(slide => slide.classList.remove('active'));
    slides[currentSlide].classList.add('active');

    // Handle Dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[currentSlide]) {
        dots[currentSlide].classList.add('active');
    }
}

function nextSlide() {
    currentSlide++;
    if (currentSlide >= totalSlides) {
        currentSlide = 0;
    }
    updateSlider();
}

function prevSlide() {
    currentSlide--;
    if (currentSlide < 0) {
        currentSlide = totalSlides - 1;
    }
    updateSlider();
}

// --- 3. SWIPE LOGIC (TOUCH EVENTS) ---
let touchStartX = 0;
let touchEndX = 0;

// Listen for finger touching the screen
sliderContainer.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
});

// Listen for finger leaving the screen
sliderContainer.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    resetTimer(); // Reset auto-play timer on user interaction
});

function handleSwipe() {
    const threshold = 50; // Minimum distance (px) to count as a swipe

    if (touchEndX < touchStartX - threshold) {
        // Swiped Left -> Next Slide
        nextSlide();
    }

    if (touchEndX > touchStartX + threshold) {
        // Swiped Right -> Previous Slide
        prevSlide();
    }
}

// --- 4. AUTO PLAY ---
function startTimer() {
    autoSlideInterval = setInterval(nextSlide, 5000);
}

function resetTimer() {
    clearInterval(autoSlideInterval);
    startTimer();
}

// --- 5. MOBILE MENU LOGIC ---
const burger = document.querySelector('.burger');
const nav = document.querySelector('.nav-links');
const navLinks = document.querySelectorAll('.nav-links li');

if (burger) {
    // Toggle Menu on Burger Click
    burger.addEventListener('click', (e) => {
        // Prevent the click from immediately triggering the document listener
        e.stopPropagation();
        nav.classList.toggle('nav-active');
        burger.classList.toggle('toggle');
    });

    // Close Menu when clicking ANYWHERE on the document (body)
    document.addEventListener('click', (e) => {
        // If the menu is open...
        if (nav.classList.contains('nav-active')) {
            // AND the click was NOT inside the nav menu...
            // AND the click was NOT on the burger icon...
            if (!nav.contains(e.target) && !burger.contains(e.target)) {
                nav.classList.remove('nav-active');
                burger.classList.remove('toggle');
            }
        }
    });

    // Close Menu when a specific link is clicked
    navLinks.forEach((link) => {
        link.addEventListener('click', () => {
            nav.classList.remove('nav-active');
            burger.classList.remove('toggle');
        });
    });
}

createDots();
updateSlider(); // <--- Added this to sync image with the dot immediately on load
startTimer();
