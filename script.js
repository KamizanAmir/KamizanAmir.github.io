document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', adjustSectionPosition);
});

function adjustSectionPosition() {
    const about = document.getElementById('about');
    const experience = document.getElementById('experience');
    const portfolio = document.getElementById('portfolio');
    const contact = document.getElementById('contact');
    
    const scrollPosition = window.scrollY;

    if (scrollPosition < about.offsetTop) {
        about.style.position = 'static';
        experience.style.position = 'static';
        portfolio.style.position = 'static';
        contact.style.position = 'static';
    } else if (scrollPosition >= about.offsetTop && scrollPosition < experience.offsetTop) {
        about.style.position = 'fixed';
        experience.style.position = 'static';
        portfolio.style.position = 'static';
        contact.style.position = 'static';
    } else if (scrollPosition >= experience.offsetTop && scrollPosition < portfolio.offsetTop) {
        about.style.position = 'static';
        experience.style.position = 'fixed';
        portfolio.style.position = 'static';
        contact.style.position = 'static';
    } else if (scrollPosition >= portfolio.offsetTop && scrollPosition < contact.offsetTop) {
        about.style.position = 'static';
        experience.style.position = 'static';
        portfolio.style.position = 'fixed';
        contact.style.position = 'static';
    } else {
        about.style.position = 'static';
        experience.style.position = 'static';
        portfolio.style.position = 'static';
        contact.style.position = 'fixed';
    }
}
