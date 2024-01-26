document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', revealSections);

    // Initial check for sections already in view on page load
    revealSections();

    function revealSections() {
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            if (isElementInViewport(section)) {
                section.classList.add('section-reveal');
            } else {
                section.classList.remove('section-reveal');
            }
        });
    }

    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
});
