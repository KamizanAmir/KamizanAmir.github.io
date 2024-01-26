document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', revealSections);
    revealSections(); // Initially reveal sections

    function revealSections() {
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            if (isElementInViewport(section)) {
                section.classList.add('section-visible');
            } else {
                section.classList.remove('section-visible');
            }
        });
    }

    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        );
    }
});