/* =============================================================================
   KAMIZAN AMIRUDIN — ARCADE PORTFOLIO ENGINE
   Vanilla, no build step, no dependencies.

   Two things changed structurally from the previous build:

   1. Movement is a requestAnimationFrame loop over a held-key set, not a
      setInterval firing discrete 20px hops. Input now has acceleration and
      friction, so holding a key feels continuous instead of stuttering, and
      the world moves at the same speed on a 60Hz and a 144Hz display.

   2. Altitude is a pure function of world X rather than a four-state machine
      ('WALKING'/'FLYING'/'ROOF_WALK'/...). The old version could desync if you
      turned around mid-flight, which stranded the balloon off-screen. A curve
      cannot desync: walk back and you descend along exactly the path you rose.
   ========================================================================== */

(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* =========================================================================
       WORLD LAYOUT
       Zone x-positions live in the HTML (data-x) so the markup stays the single
       source of truth for where things are.
       ====================================================================== */
    const WORLD_END = 15000;

    // Altitude curve keyframes: [worldX, altitude]. Everything between is a
    // smoothstep, so the ride eases in and out instead of hinging at a corner.
    const ALT_CURVE = [
        [0, 0],
        [7000, 0],       // balloon pickup
        [8000, 560],     // cruising altitude, reached before the first sky zone
        [11400, 560],    // stay up through projects + education
        [12400, 0],      // descend
        [WORLD_END, 0]
    ];

    const ZONE_LABELS = {
        intro: 'START',
        profile: 'PROFILE',
        stack: 'STACK',
        quests: 'QUESTS',
        loot: 'WORK',
        skills: 'SKILLS',
        contact: 'CONTACT',
        end: 'END'
    };

    /* =========================================================================
       ELEMENTS
       ====================================================================== */
    const $ = (id) => document.getElementById(id);

    const world = $('world');
    const hero = $('hero');
    const balloon = $('balloon');
    const overlay = $('overlay');
    const hint = $('hint');
    const pad = $('pad');
    const portal = $('portal');
    const flash = $('flash');
    const announce = $('announce');
    const railMarks = $('rail-marks');
    const railFill = $('rail-fill');
    const layers = {
        stars: $('layer-stars'),
        far: $('layer-far'),
        near: $('layer-near')
    };
    const hud = {
        progress: $('hud-progress'),
        alt: $('hud-alt'),
        zone: $('hud-zone')
    };

    const zones = Array.from(document.querySelectorAll('.zone'));
    const obstacles = Array.from(document.querySelectorAll('.obstacle'));
    const placeables = Array.from(document.querySelectorAll('[data-x]'));

    /* =========================================================================
       STATE
       ====================================================================== */
    const state = {
        x: 0,             // camera position in world units
        vx: 0,            // velocity, px per frame at 60fps
        facing: 1,
        started: false,
        paused: false,
        jumpUntil: 0,
        travelTo: null,   // fast-travel target, or null
        lastTime: 0,

        // Portal sequence: null while playing, otherwise the current phase.
        // While set, player input is ignored and the loop drives the character.
        cinematic: null,
        heroOffset: 0,    // screen-space nudge, used only by the portal walk
        warp: 1           // hero scale during the warp-out
    };

    const held = new Set();

    // Config
    const ACCEL = 1.5;
    const MAX_SPEED = 15;
    const FRICTION = 0.82;
    const TRAVEL_SPEED = 90;   // px per frame while fast-travelling
    const JUMP_MS = 520;
    const JUMP_H = 150;

    const heroScreenX = () => (window.innerWidth < 600 ? 42 : 200);
    const groundH = () =>
        parseInt(getComputedStyle(document.documentElement).getPropertyValue('--ground-h'), 10) || 74;

    /* =========================================================================
       ALTITUDE CURVE
       ====================================================================== */
    function altitudeAt(x) {
        for (let i = 0; i < ALT_CURVE.length - 1; i++) {
            const [x0, a0] = ALT_CURVE[i];
            const [x1, a1] = ALT_CURVE[i + 1];
            if (x < x0 || x > x1) continue;
            if (a0 === a1) return a0;
            const t = (x - x0) / (x1 - x0);
            // smoothstep — no visible kink where the segments meet
            const e = t * t * (3 - 2 * t);
            return a0 + (a1 - a0) * e;
        }
        return ALT_CURVE[ALT_CURVE.length - 1][1];
    }

    /* =========================================================================
       LAYOUT
       Everything positioned from data-x, and lifted by the altitude curve so a
       sky zone always arrives at eye level rather than above or below it.
       ====================================================================== */
    function layoutWorld() {
        placeables.forEach((el) => {
            const x = Number(el.dataset.x) || 0;
            el.style.left = x + 'px';

            // Clear the inline value first so the reading is the stylesheet's
            // base, not the lifted value written on the previous pass —
            // otherwise every resize stacked another altitude on top and the
            // sky zones climbed off the screen. Clearing also re-picks up the
            // breakpoint's own bottom after a rotation.
            el.style.bottom = '';
            const alt = altitudeAt(x);
            if (alt <= 0) return;

            // The world translates DOWN by `alt` when the camera reaches this
            // x, so anything here is raised by the same amount to land back at
            // ground height on screen.
            const base = parseFloat(getComputedStyle(el).bottom) || 0;
            el.style.bottom = (base + alt) + 'px';
        });

        // Zones are centred on their x, not left-aligned to it
        zones.forEach((z) => {
            z.style.width = '100vw';
            z.style.left = (Number(z.dataset.x) - window.innerWidth / 2) + 'px';
        });

        world.style.width = WORLD_END + 'px';
        hero.style.left = heroScreenX() + 'px';

        // Rail positions depend on viewport width (camera space does), so they
        // are recomputed here rather than fixed once at build time.
        const max = camMax();
        Array.from(railMarks.children).forEach((mark) => {
            const target = clampX(Number(mark.dataset.target) - window.innerWidth / 2);
            mark.style.left = ((target / max) * 100) + '%';
        });
    }

    /* =========================================================================
       ZONE RAIL — the map, and the reason this is usable at all
       ====================================================================== */
    function buildRail() {
        zones.forEach((z, i) => {
            const x = Number(z.dataset.x);
            const key = z.dataset.zone;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'rail-mark';
            btn.dataset.target = String(x);
            btn.setAttribute('aria-label', `Zone ${i + 1}: ${ZONE_LABELS[key]}`);
            btn.innerHTML = `<span>${ZONE_LABELS[key]}</span>`;
            btn.addEventListener('click', () => travelTo(x));
            railMarks.appendChild(btn);
        });
    }

    // Takes a zone's world x and converts it to the camera position that puts
    // that zone in the middle of the screen. Passing a zone x straight through
    // as a camera position is what left every jump landing half a screen short.
    function travelTo(zoneX) {
        if (state.cinematic) return;
        const x = zoneX - window.innerWidth / 2;
        startGame();
        closeOverlay();
        if (reduceMotion) {
            // No glide: land on it immediately, then let the normal frame
            // update handle the HUD.
            state.x = clampX(x);
            state.vx = 0;
            state.travelTo = null;
            requestAnimationFrame(focusNearestPanel);
        } else {
            state.travelTo = clampX(x);
        }
    }

    // The camera stops where the last zone sits centred — walking past the
    // end of the content would only show empty ground.
    function camMax() {
        const endX = Number(zones[zones.length - 1].dataset.x);
        return Math.max(1, endX - window.innerWidth / 2);
    }

    const clampX = (x) => Math.max(0, Math.min(x, camMax()));

    // Only ever called after a deliberate jump — focusing on every arrival
    // would yank focus out from under someone who is just walking past.
    function focusNearestPanel() {
        const centre = window.innerWidth / 2;
        let nearest = null;
        let best = Infinity;
        zones.forEach((z) => {
            const d = Math.abs((Number(z.dataset.x) - state.x) - centre);
            if (d < best) { best = d; nearest = z; }
        });
        if (nearest && best < centre) {
            nearest.querySelector('.panel')?.focus({ preventScroll: true });
        }
    }

    /* =========================================================================
       INPUT
       ====================================================================== */
    const LEFT_KEYS = ['ArrowLeft', 'KeyA'];
    const RIGHT_KEYS = ['ArrowRight', 'KeyD'];

    window.addEventListener('keydown', (e) => {
        // Never swallow keys while the visitor is typing into the contact form
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

        if (e.code === 'Escape') {
            e.preventDefault();
            if (state.cinematic) return;
            overlay.hasAttribute('hidden') || overlay.classList.contains('is-hiding')
                ? openOverlay()
                : closeOverlay();
            return;
        }

        // Number keys 1-8 warp to a zone
        if (/^Digit[1-8]$/.test(e.code)) {
            const idx = Number(e.code.slice(5)) - 1;
            if (zones[idx]) {
                e.preventDefault();
                travelTo(Number(zones[idx].dataset.x));
            }
            return;
        }

        if (LEFT_KEYS.includes(e.code) || RIGHT_KEYS.includes(e.code) || e.code === 'Space') {
            e.preventDefault();
            if (state.cinematic) return;
            startGame();
            if (e.code === 'Space') jump();
            else held.add(e.code);
        }
    });

    window.addEventListener('keyup', (e) => held.delete(e.code));

    // Losing focus mid-hold would otherwise leave the hero walking forever
    window.addEventListener('blur', () => held.clear());

    /* ---- Touch pad: Pointer Events, so mouse and stylus work too ----
       The previous build listened for touchstart only, which meant the
       on-screen controls were completely dead on a laptop. */
    pad.querySelectorAll('.pad-btn').forEach((btn) => {
        const dir = btn.dataset.dir;

        const down = (e) => {
            e.preventDefault();
            btn.classList.add('is-down');
            btn.setPointerCapture?.(e.pointerId);
            startGame();
            if (dir) held.add(dir === '1' ? 'ArrowRight' : 'ArrowLeft');
            else jump();
        };

        const up = () => {
            btn.classList.remove('is-down');
            if (dir) held.delete(dir === '1' ? 'ArrowRight' : 'ArrowLeft');
        };

        btn.addEventListener('pointerdown', down);
        btn.addEventListener('pointerup', up);
        btn.addEventListener('pointercancel', up);
        btn.addEventListener('pointerleave', up);
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });

    // Show the pad only where there is no fine pointer — a laptop gets the
    // keyboard legend instead of thumb buttons covering the world.
    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
    const syncPad = () => {
        pad.classList.toggle('is-on', coarse.matches);
        // Panels and the hint lift out from behind the pad only when it's there
        document.body.classList.toggle('has-pad', coarse.matches);
    };
    coarse.addEventListener('change', syncPad);
    syncPad();

    /* =========================================================================
       OVERLAY
       ====================================================================== */
    function openOverlay() {
        state.paused = true;
        overlay.removeAttribute('hidden');
        overlay.classList.remove('is-hiding');
        held.clear();
        $('btn-start').focus();
    }

    function closeOverlay() {
        state.paused = false;
        overlay.classList.add('is-hiding');
        setTimeout(() => overlay.setAttribute('hidden', ''), 260);
    }

    function startGame() {
        if (!state.started) {
            state.started = true;
            hint.hidden = false;
            setTimeout(() => {
                hint.classList.add('is-fading');
                setTimeout(() => { hint.hidden = true; }, 300);
            }, 4200);
        }
        if (!overlay.hasAttribute('hidden')) closeOverlay();
    }

    $('btn-start').addEventListener('click', startGame);
    $('btn-help').addEventListener('click', openOverlay);
    $('btn-restart')?.addEventListener('click', runPortal);

    /* =========================================================================
       PORTAL SEQUENCE

       PLAY AGAIN opens a portal a little ahead of the character, walks them
       into it, and warps back to the start screen. Four phases, each one
       handing to the next; the loop below owns 'walk' and 'enter' because they
       need per-frame movement, while 'open' and 'reset' are just timers.
       ====================================================================== */
    let portalScreenX = 0;

    function runPortal() {
        if (state.cinematic) return;

        held.clear();
        state.vx = 0;
        state.cinematic = 'open';
        document.body.classList.add('is-warping');

        // Ahead of the character, but never off the right edge on a phone
        portalScreenX = Math.min(
            heroScreenX() + 250,
            window.innerWidth - 150
        );
        portal.style.left = (portalScreenX - 64) + 'px';
        portal.hidden = false;

        // Force a reflow so the opening transition actually runs from scale(0.1)
        void portal.offsetWidth;
        portal.classList.add('is-open');

        setTimeout(() => { state.cinematic = 'walk'; }, reduceMotion ? 120 : 620);
    }

    // Phases the render loop owns. 'open' and 'reset' are handled by timers;
    // these two need to move something every frame.
    function stepPortal(dt) {
        const target = portalScreenX - heroScreenX() - 29;   // portal centre, minus half the sprite

        if (state.cinematic === 'walk') {
            const step = (reduceMotion ? 40 : 4.6) * dt;
            state.heroOffset = Math.min(state.heroOffset + step, target);
            state.facing = 1;

            if (state.heroOffset >= target - 0.5) {
                state.heroOffset = target;
                state.cinematic = 'enter';
            }
        } else if (state.cinematic === 'enter') {
            // Shrink and fade into the mouth of the portal. Driven here rather
            // than by a CSS transition because the loop rewrites this element's
            // transform every frame and the two would fight.
            state.warp = Math.max(0, state.warp - (reduceMotion ? 0.5 : 0.055) * dt);
            if (state.warp <= 0.01) {
                state.warp = 0;
                state.cinematic = 'done';
                finishPortal();
            }
        }
    }

    function finishPortal() {
        flash.classList.add('is-on');

        setTimeout(() => {
            // Back to the opening frame, exactly as the page loads
            state.x = clampX(Number(zones[0].dataset.x) - window.innerWidth / 2);
            state.vx = 0;
            state.heroOffset = 0;
            state.warp = 1;
            state.facing = 1;
            hero.style.opacity = '1';

            portal.classList.remove('is-open');
            document.body.classList.remove('is-warping');
            setTimeout(() => { portal.hidden = true; }, 300);

            hero.style.left = heroScreenX() + 'px';
            hero.style.setProperty('--warp', '1');
            hero.style.setProperty('--jump', '0px');
            hero.style.setProperty('--face', '1');
            hero.classList.remove('is-walking');
            held.clear();

            state.cinematic = null;
            updateHud(state.x + heroScreenX(), 0);
            openOverlay();

            flash.classList.remove('is-on');
        }, reduceMotion ? 60 : 240);
    }

    /* =========================================================================
       JUMP
       Timed rather than physics-simulated: this is a portfolio, not a
       platformer, and a predictable arc is easier to land on a block with.
       ====================================================================== */
    function jump() {
        if (performance.now() < state.jumpUntil) return;
        state.jumpUntil = performance.now() + JUMP_MS;
    }

    function jumpOffset(now) {
        const left = state.jumpUntil - now;
        if (left <= 0) return 0;
        const t = 1 - left / JUMP_MS;          // 0 -> 1 across the jump
        return Math.sin(t * Math.PI) * JUMP_H; // up and back down
    }

    /* =========================================================================
       COLLISION
       One pass over the obstacle list: whichever block the hero overlaps sets
       the platform height under them.
       ====================================================================== */
    function platformUnder(worldX) {
        let top = 0;
        for (const obs of obstacles) {
            const left = Number(obs.dataset.x);
            const w = obs.offsetWidth;
            const h = Number(obs.dataset.h) || 0;
            if (worldX + 26 > left && worldX + 8 < left + w) top = Math.max(top, h);
        }
        return top;
    }

    /* =========================================================================
       MAIN LOOP
       ====================================================================== */
    function frame(now) {
        requestAnimationFrame(frame);

        // Normalise to a 60fps step so a 144Hz monitor doesn't run 2.4x fast.
        const dt = state.lastTime ? Math.min((now - state.lastTime) / 16.667, 3) : 1;
        state.lastTime = now;

        if (state.paused) return;

        /* ---- Movement ---- */
        if (state.cinematic) {
            stepPortal(dt);
        } else if (state.travelTo !== null) {
            const delta = state.travelTo - state.x;
            if (Math.abs(delta) <= TRAVEL_SPEED * dt) {
                state.x = state.travelTo;
                state.travelTo = null;
                state.vx = 0;
                focusNearestPanel();
            } else {
                const dir = Math.sign(delta);
                state.x += dir * TRAVEL_SPEED * dt;
                state.facing = dir;
            }
        } else {
            const right = RIGHT_KEYS.some((k) => held.has(k));
            const left = LEFT_KEYS.some((k) => held.has(k));
            const dir = (right ? 1 : 0) - (left ? 1 : 0);

            if (dir !== 0) {
                state.vx += dir * ACCEL * dt;
                state.facing = dir;
            } else {
                // Friction rather than a hard stop, so releasing a key coasts
                state.vx *= Math.pow(FRICTION, dt);
                if (Math.abs(state.vx) < 0.12) state.vx = 0;
            }

            state.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, state.vx));
            state.x += state.vx * dt;
        }

        if (!state.cinematic) state.x = clampX(state.x);

        /* ---- Camera ---- */
        const alt = altitudeAt(state.x + heroScreenX());
        world.style.transform = `translate3d(${-state.x}px, ${alt}px, 0)`;

        // Parallax: each layer at a fraction of camera speed
        layers.stars.style.transform = `translate3d(${-state.x * 0.06}px, ${alt * 0.10}px, 0)`;
        layers.far.style.transform = `translate3d(${-state.x * 0.18}px, ${alt * 0.35}px, 0)`;
        layers.near.style.transform = `translate3d(${-state.x * 0.42}px, ${alt * 0.7}px, 0)`;

        /* ---- Hero ---- */
        const worldX = state.x + heroScreenX();
        const platform = alt > 4 ? 0 : platformUnder(worldX);
        const lift = jumpOffset(now);
        const flying = alt > 4;

        hero.style.bottom = (groundH() + platform) + 'px';
        hero.style.left = (heroScreenX() + state.heroOffset) + 'px';
        hero.style.setProperty('--jump', lift + 'px');
        hero.style.setProperty('--face', state.facing < 0 ? '-1' : '1');
        hero.style.setProperty('--warp', String(state.warp));

        const walking = state.cinematic === 'walk'
            || (!state.cinematic && Math.abs(state.vx) > 0.5 && !flying && lift === 0);
        hero.classList.toggle('is-walking', walking);

        // Fade out with the warp scale so the character dissolves into the
        // portal rather than vanishing at full size.
        hero.style.opacity = flying ? '0' : String(state.warp);

        // The balloon is only ever drawn where the hero actually is, so it
        // cannot drift away from them the way the old state machine allowed.
        if (flying) {
            balloon.style.display = 'block';
            balloon.style.left = (worldX - 53) + 'px';
            balloon.style.bottom = (groundH() + alt) + 'px';
        } else {
            balloon.style.display = 'none';
        }

        updateHud(worldX, alt);
    }

    /* =========================================================================
       HUD + ZONE TRACKING
       ====================================================================== */
    let lastZone = null;

    function updateHud(worldX, alt) {
        const pct = Math.round(Math.min(100, (state.x / camMax()) * 100));
        hud.progress.textContent = pct + '%';
        hud.alt.textContent = Math.round(alt) + ' ft';
        railFill.style.width = pct + '%';

        // Measured on screen, not in world units: a zone is "here" when its
        // panel is near the middle of the viewport, which is true at every
        // window size rather than only at the one the threshold was tuned for.
        const centre = window.innerWidth / 2;
        let nearest = null;
        let best = Infinity;
        zones.forEach((z) => {
            const d = Math.abs((Number(z.dataset.x) - state.x) - centre);
            if (d < best) { best = d; nearest = z; }
        });

        const inZone = best < centre * 0.8 ? nearest : null;
        const key = inZone ? inZone.dataset.zone : null;
        hud.zone.textContent = key ? ZONE_LABELS[key] : '—';

        const marks = railMarks.children;
        zones.forEach((z, i) => {
            const zx = Number(z.dataset.x);
            marks[i].classList.toggle('is-passed', (zx - state.x) <= centre);
            marks[i].classList.toggle('is-current', z === inZone);
        });

        // Announce arrival once, for screen readers and for the HUD label
        if (key !== lastZone) {
            lastZone = key;
            if (key) announce.textContent = `Zone: ${ZONE_LABELS[key]}`;
        }
    }

    /* =========================================================================
       PROJECT FILTER
       aria-pressed rather than an .active class, so the state is exposed to
       assistive tech and not only to the stylesheet.
       ====================================================================== */
    const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
    const lootItems = Array.from(document.querySelectorAll('.loot-item'));

    filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
            const f = btn.dataset.filter;
            filterBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
            lootItems.forEach((item) => {
                item.hidden = !(f === 'all' || item.dataset.cat === f);
            });
        });
    });

    /* =========================================================================
       CONTACT FORM
       Inline validation, error next to its own field, focus moved to the first
       problem. The previous version wrote errors with raw style mutation and
       left the field un-associated with its message.
       ====================================================================== */
    const form = $('contact-form');

    if (form) {
        const rules = [
            ['cf-name', (v) => v.trim().length >= 2, 'NAME IS TOO SHORT'],
            ['cf-email', (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'CHECK THE EMAIL ADDRESS'],
            ['cf-subject', (v) => v.trim().length >= 3, 'SUBJECT IS TOO SHORT'],
            ['cf-message', (v) => v.trim().length >= 10, 'MESSAGE NEEDS 10+ CHARACTERS']
        ];

        const setError = (field, msg) => {
            const box = document.getElementById('err-' + field.id.slice(3));
            box.textContent = msg || '';
            field.setAttribute('aria-invalid', msg ? 'true' : 'false');
            if (msg) {
                field.classList.remove('shake');
                void field.offsetWidth;              // restart the animation
                field.classList.add('shake');
            }
        };

        // Clear an error as soon as the visitor fixes it, rather than making
        // them submit again to find out.
        rules.forEach(([id, test]) => {
            const field = $(id);
            field.addEventListener('input', () => {
                if (field.getAttribute('aria-invalid') === 'true' && test(field.value)) {
                    setError(field, '');
                }
            });
        });

        form.addEventListener('submit', (e) => {
            let firstBad = null;

            rules.forEach(([id, test, msg]) => {
                const field = $(id);
                const ok = test(field.value);
                setError(field, ok ? '' : msg);
                if (!ok && !firstBad) firstBad = field;
            });

            if (firstBad) {
                e.preventDefault();
                firstBad.focus();
                return;
            }

            const submit = $('cf-submit');
            submit.textContent = 'SENDING…';
            submit.disabled = true;
        });
    }

    /* =========================================================================
       BOOT
       ====================================================================== */
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layoutWorld, 150);
    });

    buildRail();
    layoutWorld();

    // Open with the first zone centred instead of pinned to the left gutter.
    state.x = clampX(Number(zones[0].dataset.x) - window.innerWidth / 2);

    requestAnimationFrame(frame);

    // Deep link: /portfolio/#stack lands on that zone
    const hash = location.hash.replace('#', '');
    if (hash) {
        const z = zones.find((el) => el.dataset.zone === hash);
        if (z) {
            state.x = clampX(Number(z.dataset.x) - window.innerWidth / 2);
            startGame();
        }
    }
})();
