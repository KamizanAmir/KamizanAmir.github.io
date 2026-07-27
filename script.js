document.addEventListener('DOMContentLoaded', () => {

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* =========================================
       1. MOBILE NAVIGATION
       ========================================= */
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    const navBackdrop = document.getElementById('nav-backdrop');

    if (navToggle && navLinks) {
        const toggleIcon = navToggle.querySelector('i');

        const setNav = (open) => {
            navLinks.classList.toggle('open', open);
            navBackdrop.classList.toggle('show', open);
            document.body.classList.toggle('nav-open', open);
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
            if (toggleIcon) {
                toggleIcon.classList.toggle('fa-bars', !open);
                toggleIcon.classList.toggle('fa-xmark', open);
            }
        };

        const closeNav = () => setNav(false);

        navToggle.addEventListener('click', () => {
            setNav(navToggle.getAttribute('aria-expanded') !== 'true');
        });

        navBackdrop.addEventListener('click', closeNav);

        // Tapping a link should navigate *and* dismiss the drawer
        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', closeNav);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeNav();
        });

        // Rotating to landscape can cross the desktop breakpoint while open,
        // which would otherwise leave the body scroll-locked.
        window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
            if (e.matches) closeNav();
        });
    }

    /* =========================================
       2. STAR PARTICLE SYSTEM (CANVAS)
       ========================================= */
    const canvas = document.getElementById('star-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    if (ctx) {
        let particlesArray = [];
        let animationId = null;

        // Cap density so low-end phones aren't asked to run an O(n²)
        // constellation pass on hundreds of particles every frame.
        const particleCap = () => (window.innerWidth < 768 ? 55 : 140);
        const drawsLines = () => window.innerWidth >= 480;

        const sizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        class Particle {
            constructor(x, y, directionX, directionY, size) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.opacity = Math.random() * 0.5 + 0.1; // Twinkle effect base
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.shadowBlur = 10;
                ctx.shadowColor = 'white';
                ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                ctx.fill();
                ctx.shadowBlur = 0; // Reset
            }

            update() {
                if (this.x > canvas.width || this.x < 0) {
                    this.directionX = -this.directionX;
                }
                if (this.y > canvas.height || this.y < 0) {
                    this.directionY = -this.directionY;
                }
                this.x += this.directionX;
                this.y += this.directionY;

                // Twinkle Logic
                if (Math.random() > 0.98) {
                    this.opacity = Math.random() * 0.8 + 0.2;
                }

                this.draw();
            }
        }

        function initParticles() {
            particlesArray = [];
            const density = (canvas.height * canvas.width) / 9000;
            const numberOfParticles = Math.min(density, particleCap());

            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 2) + 0.1;
                const x = Math.random() * (canvas.width - size * 4) + size * 2;
                const y = Math.random() * (canvas.height - size * 4) + size * 2;
                const directionX = (Math.random() * 0.4) - 0.2; // Slow float speed
                const directionY = (Math.random() * 0.4) - 0.2;

                particlesArray.push(new Particle(x, y, directionX, directionY, size));
            }
        }

        // Connect particles with lines if close (Constellation effect)
        function connectParticles() {
            const threshold = (canvas.width / 7) * (canvas.height / 7);

            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a + 1; b < particlesArray.length; b++) {
                    const dx = particlesArray[a].x - particlesArray[b].x;
                    const dy = particlesArray[a].y - particlesArray[b].y;
                    const distance = dx * dx + dy * dy;

                    if (distance < threshold) {
                        const opacityValue = 1 - (distance / 20000);
                        ctx.strokeStyle = 'rgba(112, 0, 255,' + opacityValue * 0.15 + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        function animateParticles() {
            animationId = requestAnimationFrame(animateParticles);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < particlesArray.length; i++) {
                particlesArray[i].update();
            }
            if (drawsLines()) connectParticles();
        }

        function renderStatic() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particlesArray.forEach((p) => p.draw());
        }

        sizeCanvas();
        initParticles();

        if (reduceMotion) {
            renderStatic();
        } else {
            animateParticles();
        }

        // Mobile browsers fire resize every time the URL bar hides/shows.
        // Only rebuild when the width actually changes, so scrolling doesn't
        // reshuffle the starfield.
        let lastWidth = window.innerWidth;
        let resizeTimer;

        window.addEventListener('resize', () => {
            if (window.innerWidth === lastWidth) return;
            lastWidth = window.innerWidth;

            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                sizeCanvas();
                initParticles();
                if (reduceMotion) renderStatic();
            }, 200);
        });

        // Stop burning battery while the tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (reduceMotion) return;

            if (document.hidden) {
                cancelAnimationFrame(animationId);
                animationId = null;
            } else if (animationId === null) {
                animateParticles();
            }
        });
    }

    /* =========================================
       3. TYPEWRITER EFFECT
       ========================================= */
    const typeSpan = document.querySelector('.typewriter-text');
    const texts = ['System Architect', 'Full Stack Developer', 'Cloud Engineer', 'Legacy Modernizer'];

    if (typeSpan) {
        let count = 0;
        let index = 0;

        (function type() {
            if (count === texts.length) {
                count = 0;
            }
            const currentText = texts[count];
            const letter = currentText.slice(0, ++index);

            typeSpan.textContent = letter;

            if (letter.length === currentText.length) {
                count++;
                index = 0;
                setTimeout(type, 2000); // Wait before deleting/next word
            } else {
                setTimeout(type, 100);
            }
        })();
    }

    /* =========================================
       4. SCROLL REVEAL ANIMATION
       ========================================= */
    const revealElements = document.querySelectorAll('.reveal');

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealElements.forEach((el) => el.classList.add('active'));
    } else {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -10% 0px' });

        revealElements.forEach((el) => observer.observe(el));
    }
});
