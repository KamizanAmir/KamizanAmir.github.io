/* =============================================================================
   KAMIZAN AMIRUDIN — PORTFOLIO
   Vanilla, no build step, no dependencies.

   Everything here is guarded on prefers-reduced-motion and on the element
   actually existing, so a page that drops a section doesn't take the script
   down with it.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* =========================================================================
       1. FOOTER YEAR
       ====================================================================== */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* =========================================================================
       2. NAVIGATION — drawer, sticky state, scroll-spy

       All three read or write the same scroll position, so they share one
       rAF-throttled handler. Three separate scroll listeners is how a page
       starts dropping frames on a mid-range phone.
       ====================================================================== */
    const nav = document.getElementById('nav');
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');
    const navBackdrop = document.getElementById('nav-backdrop');
    const progressBar = document.getElementById('scroll-progress');
    const spyLinks = Array.from(document.querySelectorAll('.nav-link[href^="#"]'));
    const sections = spyLinks
        .map((link) => document.querySelector(link.getAttribute('href')))
        .filter(Boolean);

    /* ---- Mobile drawer ---- */
    if (navToggle && navLinks && navBackdrop) {
        const icon = navToggle.querySelector('i');

        const setNav = (open) => {
            navLinks.classList.toggle('open', open);
            navBackdrop.classList.toggle('show', open);
            document.body.classList.toggle('nav-open', open);
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
            if (icon) {
                icon.classList.toggle('fa-bars', !open);
                icon.classList.toggle('fa-xmark', open);
            }
        };

        const closeNav = () => setNav(false);

        navToggle.addEventListener('click', () => {
            setNav(navToggle.getAttribute('aria-expanded') !== 'true');
        });

        navBackdrop.addEventListener('click', closeNav);

        // Tapping a link should navigate *and* dismiss the drawer
        navLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeNav();
        });

        // Rotating to landscape can cross the desktop breakpoint while the
        // drawer is open, which would otherwise leave the body scroll-locked.
        window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => {
            if (e.matches) closeNav();
        });
    }

    /* ---- Sticky nav + progress + scroll-spy, one handler ---- */
    let ticking = false;

    const onScroll = () => {
        const y = window.scrollY;

        if (nav) nav.classList.toggle('is-stuck', y > 24);

        if (progressBar) {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            const ratio = max > 0 ? Math.min(y / max, 1) : 0;
            progressBar.style.transform = `scaleX(${ratio})`;
        }

        if (sections.length) {
            // "Current" = the last section whose top has passed the reading
            // line, a third of the way down the viewport. Using the viewport
            // top instead makes the highlight flip a section too early.
            const line = y + window.innerHeight * 0.33;
            let current = -1;

            sections.forEach((sec, i) => {
                if (sec.offsetTop <= line) current = i;
            });

            // Bottom of the page always belongs to the final section, which
            // short sections would otherwise never reach.
            if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) {
                current = sections.length - 1;
            }

            spyLinks.forEach((link, i) => link.classList.toggle('is-active', i === current));
        }

        ticking = false;
    };

    window.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(onScroll);
    }, { passive: true });

    onScroll();

    /* =========================================================================
       3. SCROLL REVEAL
       ====================================================================== */
    const revealTargets = document.querySelectorAll('.reveal, .stagger');

    if (reduceMotion || !('IntersectionObserver' in window)) {
        revealTargets.forEach((el) => el.classList.add('is-in'));
    } else {
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

        revealTargets.forEach((el) => io.observe(el));
    }

    /* =========================================================================
       4. TYPEWRITER — types and deletes

       The old version only typed forward and then snapped to empty, which
       reads as a glitch. This one deletes at roughly twice typing speed,
       the way a real terminal correction looks.
       ====================================================================== */
    const typed = document.getElementById('typed');

    if (typed) {
        const phrases = [
            'building enterprise systems',
            'wiring MES into SAP B1',
            'shipping Laravel + Vue',
            'debugging production, calmly',
            'mentoring the next dev'
        ];

        if (reduceMotion) {
            typed.textContent = phrases[0];
        } else {
            let phrase = 0;
            let char = 0;
            let deleting = false;

            const tick = () => {
                const text = phrases[phrase];
                char += deleting ? -1 : 1;
                typed.textContent = text.slice(0, char);

                let delay = deleting ? 38 : 72;

                if (!deleting && char === text.length) {
                    deleting = true;
                    delay = 1800;            // hold the finished phrase
                } else if (deleting && char === 0) {
                    deleting = false;
                    phrase = (phrase + 1) % phrases.length;
                    delay = 320;             // beat before the next one
                }

                setTimeout(tick, delay);
            };

            setTimeout(tick, 700);
        }
    }

    /* =========================================================================
       5. STAT COUNTERS

       Counts once, when the tile first scrolls in. eased so it decelerates
       rather than running at a constant clip.
       ====================================================================== */
    const counters = document.querySelectorAll('.stat-num[data-count]');

    if (counters.length) {
        const paint = (el) => {
            const target = Number(el.dataset.count) || 0;
            const suffix = el.dataset.suffix || '';
            el.textContent = `${target}${suffix}`;
        };

        if (reduceMotion || !('IntersectionObserver' in window)) {
            counters.forEach(paint);
        } else {
            const run = (el) => {
                const target = Number(el.dataset.count) || 0;
                const suffix = el.dataset.suffix || '';
                const duration = 1200;
                const start = performance.now();

                const step = (now) => {
                    const t = Math.min((now - start) / duration, 1);
                    const eased = 1 - Math.pow(1 - t, 3);   // easeOutCubic
                    el.textContent = `${Math.round(target * eased)}${suffix}`;
                    if (t < 1) requestAnimationFrame(step);
                };

                requestAnimationFrame(step);
            };

            const countObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    run(entry.target);
                    countObserver.unobserve(entry.target);
                });
            }, { threshold: 0.4 });

            counters.forEach((el) => countObserver.observe(el));
        }
    }

    /* =========================================================================
       6. CARD SPOTLIGHT

       Feeds the cursor position to CSS as --mx/--my. One delegated listener on
       the grid rather than one per card, and skipped entirely on touch, where
       there is no hover to track.
       ====================================================================== */
    const hasHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (hasHover && !reduceMotion) {
        document.querySelectorAll('.project-grid, .stack-grid, .edu-grid').forEach((grid) => {
            grid.addEventListener('pointermove', (e) => {
                const card = e.target.closest('.card, .stack-card, .edu-card');
                if (!card) return;
                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', `${e.clientX - r.left}px`);
                card.style.setProperty('--my', `${e.clientY - r.top}px`);
            });
        });
    }

    /* =========================================================================
       7. BACKGROUND — node network

       A systems metaphor rather than a starfield: nodes drift, near ones link.
       Density is capped hard because the link pass is O(n²) and phones run it
       every frame. Tinted to the accent palette so it belongs to the page.
       ====================================================================== */
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

    if (ctx) {
        let nodes = [];
        let raf = null;
        let dpr = 1;

        const nodeCap = () => (window.innerWidth < 768 ? 34 : 78);
        const linkDist = () => (window.innerWidth < 768 ? 108 : 148);
        const drawsLinks = () => window.innerWidth >= 480;

        const sizeCanvas = () => {
            // Cap DPR at 2 — a 3x buffer on a phone quadruples fill cost for
            // a blurred background nobody is inspecting.
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.floor(window.innerWidth * dpr);
            canvas.height = Math.floor(window.innerHeight * dpr);
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        const build = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const count = Math.min(Math.floor((w * h) / 17000), nodeCap());

            nodes = Array.from({ length: count }, () => ({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.22,
                vy: (Math.random() - 0.5) * 0.22,
                r: Math.random() * 1.5 + 0.6,
                // Two-thirds green, one-third cyan — same ratio the UI uses
                hue: Math.random() > 0.66 ? '76, 201, 240' : '61, 220, 151',
                a: Math.random() * 0.35 + 0.15
            }));
        };

        const drawNodes = () => {
            nodes.forEach((n) => {
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${n.hue}, ${n.a})`;
                ctx.fill();
            });
        };

        const drawLinks = () => {
            const max = linkDist();
            const maxSq = max * max;

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > maxSq) continue;

                    // Fade with distance so links dissolve instead of popping
                    const alpha = (1 - d2 / maxSq) * 0.16;
                    ctx.strokeStyle = `rgba(61, 220, 151, ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        };

        const frame = () => {
            raf = requestAnimationFrame(frame);
            const w = window.innerWidth;
            const h = window.innerHeight;
            ctx.clearRect(0, 0, w, h);

            nodes.forEach((n) => {
                n.x += n.vx;
                n.y += n.vy;
                if (n.x <= 0 || n.x >= w) n.vx *= -1;
                if (n.y <= 0 || n.y >= h) n.vy *= -1;
            });

            if (drawsLinks()) drawLinks();
            drawNodes();
        };

        const renderStatic = () => {
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
            if (drawsLinks()) drawLinks();
            drawNodes();
        };

        sizeCanvas();
        build();

        if (reduceMotion) {
            renderStatic();
        } else {
            frame();
        }

        // Mobile browsers fire resize every time the URL bar hides or shows.
        // Only rebuild when the width actually changes, so scrolling doesn't
        // reshuffle the field under the reader.
        let lastWidth = window.innerWidth;
        let resizeTimer;

        window.addEventListener('resize', () => {
            if (window.innerWidth === lastWidth) return;
            lastWidth = window.innerWidth;

            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                sizeCanvas();
                build();
                if (reduceMotion) renderStatic();
            }, 180);
        });

        // Stop burning battery while the tab is hidden
        document.addEventListener('visibilitychange', () => {
            if (reduceMotion) return;

            if (document.hidden) {
                cancelAnimationFrame(raf);
                raf = null;
            } else if (raf === null) {
                frame();
            }
        });
    }
});
