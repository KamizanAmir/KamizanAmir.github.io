/* =============================================================================
   KAMIZAN AMIRUDIN — ARCADE PORTFOLIO ENGINE
   Vanilla, no build step, no dependencies.

   Features:
   - Fluid requestAnimationFrame loop with acceleration & friction
   - Smoothstep altitude curve
   - Precise Mario-style Goomba/Bug enemies with tight hitboxes & stomping
   - Interactive ? mystery blocks & breakable bricks (shatters on Giant impact)
   - Super Mushroom power-up for Giant Mode (1.85x scale, smash bricks, invincible)
   - Giant Cloud Rider floating high in the sky zones with open sky below
   - In-Pipe Transit & Interactive Peek Navigation (Left/Right to peek, Up to emerge)
   - Non-destructive CSS transform pipeline preserving jump & directional flip
   - Retro 6-digit score system & HUD counter
   ========================================================================== */

(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* =========================================================================
       WORLD LAYOUT
       ====================================================================== */
    const WORLD_END = 15000;

    const ALT_CURVE = [
        [0, 0],
        [7000, 0],       // balloon / cloud pickup
        [8000, 560],     // cruising altitude
        [11400, 560],    // stay up through sky zones
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

    const WARP_PIPES = [
        { x: 1330, name: 'ZONE 01 / 02 (PROFILE)' },
        { x: 4500, name: 'ZONE 03 / 04 (QUESTS)' },
        { x: 6800, name: 'ZONE 04 / 05 (SKY LAUNCH)' },
        { x: 12100, name: 'ZONE 07 / 08 (CONTACT)' }
    ];

    /* =========================================================================
       ELEMENTS
       ====================================================================== */
    const $ = (id) => document.getElementById(id);

    const world = $('world');
    const hero = $('hero');
    const balloon = $('balloon');
    const cyberCloud = $('cyber-cloud');
    const overlay = $('overlay');
    const pipeTransitHud = $('pipe-transit-hud');
    const transitPipeName = $('transit-pipe-name');
    const btnPeekPrev = $('btn-peek-prev');
    const btnPeekNext = $('btn-peek-next');
    const btnPeekEmerge = $('btn-peek-emerge');
    const hint = $('hint');
    const pad = $('pad');
    const portal = $('portal');
    const sheet = $('zones');
    const sheetList = $('zones-list');
    const zoneCount = $('zone-count');
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
        zone: $('hud-zone'),
        score: $('hud-score')
    };

    const zones = Array.from(document.querySelectorAll('.zone'));
    const obstacles = Array.from(document.querySelectorAll('.obstacle'));
    let placeables = Array.from(document.querySelectorAll('[data-x]'));

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

        // Cinematic & warp states
        cinematic: null,
        heroOffset: 0,
        warp: 1,

        // Arcade Gameplay states
        score: 0,
        isGiant: false,
        giantUntil: 0,
        invulnerableUntil: 0,
        isWarping: false,

        // In-Pipe Peek Transit system
        inPipeTransit: false,
        pipeTransitIndex: 0
    };

    const held = new Set();

    // Config
    const ACCEL = 1.5;
    const MAX_SPEED = 15;
    const FRICTION = 0.82;
    const TRAVEL_SPEED = 90;
    const JUMP_MS = 520;
    const JUMP_H = 150;

    const heroScreenX = () => {
        if (window.innerWidth < 600) return 42;
        if (window.innerHeight <= 460 && window.innerWidth > window.innerHeight) return 92;
        return 200;
    };
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
            const e = t * t * (3 - 2 * t);
            return a0 + (a1 - a0) * e;
        }
        return ALT_CURVE[ALT_CURVE.length - 1][1];
    }

    /* =========================================================================
       ARCADE SCORE & POPUPS
       ====================================================================== */
    function addScore(points, worldX, worldY, text, isGiant) {
        state.score += points;
        if (hud.score) {
            hud.score.textContent = String(state.score).padStart(6, '0');
        }
        if (worldX !== undefined && worldY !== undefined) {
            spawnScorePopup(worldX, worldY, text || `+${points}`, isGiant);
        }
    }

    function spawnScorePopup(x, y, text, isGiant) {
        const popup = document.createElement('div');
        popup.className = 'score-popup' + (isGiant ? ' giant-popup' : '');
        popup.textContent = text;
        popup.style.left = x + 'px';
        popup.style.bottom = y + 'px';
        world.appendChild(popup);
        setTimeout(() => popup.remove(), 850);
    }

    /* =========================================================================
       ENEMIES SYSTEM (GOOMBAS / BUG BOTS)
       ====================================================================== */
    let enemies = [];

    function initEnemies() {
        enemies.forEach(e => {
            if (e.el && e.el.parentNode) e.el.remove();
        });
        enemies = [];

        const rawEnemies = Array.from(document.querySelectorAll('.arcade-enemy'));
        rawEnemies.forEach((el) => {
            const startX = Number(el.dataset.x) || 0;
            const minX = Number(el.dataset.min) || (startX - 80);
            const maxX = Number(el.dataset.max) || (startX + 80);

            el.innerHTML = `
                <div class="enemy-body">
                    <div class="enemy-eyes">
                        <div class="enemy-eye"></div>
                        <div class="enemy-eye"></div>
                    </div>
                    <div class="enemy-teeth">
                        <div class="enemy-tooth"></div>
                        <div class="enemy-tooth"></div>
                    </div>
                </div>
                <div class="enemy-feet">
                    <div class="enemy-foot"></div>
                    <div class="enemy-foot"></div>
                </div>
            `;
            el.style.left = startX + 'px';
            el.classList.remove('is-stomped', 'is-blasted', 'walk-step-1', 'walk-step-2');

            enemies.push({
                el,
                x: startX,
                initialX: startX,
                minX,
                maxX,
                dir: -1,
                speed: 1.25,
                dead: false,
                stepTime: 0
            });
        });
    }

    /* =========================================================================
       INTERACTIVE BLOCKS & BRICKS
       ====================================================================== */
    let blocks = [];

    function initBlocks() {
        blocks = [];
        const rawBlocks = Array.from(document.querySelectorAll('.interactive-block'));
        rawBlocks.forEach((el) => {
            const x = Number(el.dataset.x) || 0;
            const y = Number(el.dataset.y) || 130;
            const isMystery = el.classList.contains('block-mystery');
            const hasMushroom = el.dataset.item === 'mushroom';

            el.style.left = x + 'px';
            el.style.bottom = (groundH() + y) + 'px';
            el.classList.remove('is-bumped', 'is-empty');
            el.style.display = 'flex';

            blocks.push({
                el,
                x,
                y,
                type: isMystery ? 'mystery' : 'brick',
                hasMushroom,
                empty: false,
                broken: false,
                lastHitTime: 0
            });
        });
    }

    function shatterBrick(block) {
        if (block.broken) return;
        block.broken = true;
        block.el.style.display = 'none';

        world.classList.add('is-shaking');
        setTimeout(() => world.classList.remove('is-shaking'), 200);

        const shards = [
            { dx: -45, dy: 85 },
            { dx: 45, dy: 85 },
            { dx: -25, dy: 120 },
            { dx: 25, dy: 120 }
        ];

        shards.forEach((s) => {
            const shard = document.createElement('div');
            shard.className = 'brick-shard';
            shard.style.left = (block.x + 12) + 'px';
            shard.style.bottom = (groundH() + block.y + 12) + 'px';
            shard.style.setProperty('--dx', s.dx + 'px');
            shard.style.setProperty('--dy', s.dy + 'px');
            world.appendChild(shard);
            setTimeout(() => shard.remove(), 650);
        });
    }

    /* =========================================================================
       SUPER MUSHROOM & GIANT POWER-UP
       ====================================================================== */
    let mushrooms = [];

    function spawnMushroom(x, y) {
        const shroomEl = document.createElement('div');
        shroomEl.className = 'super-mushroom';
        shroomEl.innerHTML = `
            <div class="shroom-cap">
                <div class="shroom-spot spot-center"></div>
                <div class="shroom-spot spot-left"></div>
                <div class="shroom-spot spot-right"></div>
            </div>
            <div class="shroom-stem">
                <div class="shroom-eye left"></div>
                <div class="shroom-eye right"></div>
            </div>
        `;
        const shroomX = x + 4;
        const shroomY = y + 48;
        shroomEl.style.left = shroomX + 'px';
        shroomEl.style.bottom = (groundH() + shroomY) + 'px';
        world.appendChild(shroomEl);

        const shroomObj = {
            el: shroomEl,
            x: shroomX,
            y: shroomY,
            active: true
        };
        mushrooms.push(shroomObj);

        shroomEl.addEventListener('click', () => collectMushroom(shroomObj));
    }

    function collectMushroom(m) {
        if (!m.active) return;
        m.active = false;
        m.el.remove();
        mushrooms = mushrooms.filter(item => item !== m);

        addScore(1000, m.x, groundH() + m.y + 30, '🍄 GIANT MODE! +1000', true);

        state.isGiant = true;
        state.giantUntil = performance.now() + 9000;
        announce.textContent = '🍄 SUPER GIANT MODE ACTIVATED!';
    }

    /* =========================================================================
       IN-PIPE TRANSIT & PEEK NAVIGATION
       ====================================================================== */
    function checkWarpPipes() {
        if (state.isWarping || state.cinematic || state.inPipeTransit) return;
        const heroX = state.x + heroScreenX() + 29;
        const warpPipes = Array.from(document.querySelectorAll('.warp-pipe'));

        warpPipes.forEach(pipe => {
            const px = Number(pipe.dataset.x) || 0;
            const prompt = pipe.querySelector('.warp-prompt');
            const near = Math.abs(heroX - (px + 42)) < 55;
            if (prompt) prompt.style.display = near ? 'block' : 'none';
        });
    }

    function enterPipeTransit(pipe) {
        if (state.inPipeTransit || state.isWarping || state.cinematic) return;

        const currentX = Number(pipe.dataset.x) || 0;
        let matchedIdx = WARP_PIPES.findIndex(p => Math.abs(p.x - currentX) < 80);
        if (matchedIdx === -1) matchedIdx = 0;

        state.inPipeTransit = true;
        state.pipeTransitIndex = matchedIdx;
        held.clear();
        state.vx = 0;

        // Slide down into pipe
        hero.style.transition = 'opacity 220ms ease';
        hero.style.setProperty('--pipe-y', '75px');
        hero.style.opacity = '0';

        setTimeout(() => {
            flash.classList.add('is-on');
            setTimeout(() => {
                flash.classList.remove('is-on');
                showPipeTransitHud();
            }, reduceMotion ? 50 : 180);
        }, 220);
    }

    function showPipeTransitHud() {
        if (!pipeTransitHud) return;
        const currentPipe = WARP_PIPES[state.pipeTransitIndex];

        // Center camera smoothly on peeked pipe
        state.x = clampX(currentPipe.x - window.innerWidth / 2);
        const alt = altitudeAt(currentPipe.x);
        world.style.transform = `translate3d(${-state.x}px, ${alt}px, 0)`;

        // Highlight peeked pipe
        Array.from(document.querySelectorAll('.warp-pipe')).forEach(p => {
            const px = Number(p.dataset.x) || 0;
            p.classList.toggle('is-peeking', Math.abs(px - currentPipe.x) < 80);
        });

        if (transitPipeName) {
            transitPipeName.textContent = `PEEKING: ${currentPipe.name}`;
        }
        pipeTransitHud.removeAttribute('hidden');
        announce.textContent = `Inside pipe network. Peeking: ${currentPipe.name}. Press UP to emerge.`;
    }

    function peekPipe(dir) {
        if (!state.inPipeTransit) return;
        state.pipeTransitIndex = (state.pipeTransitIndex + dir + WARP_PIPES.length) % WARP_PIPES.length;
        showPipeTransitHud();
    }

    function emergeFromPipe() {
        if (!state.inPipeTransit) return;
        const targetPipe = WARP_PIPES[state.pipeTransitIndex];

        if (pipeTransitHud) pipeTransitHud.setAttribute('hidden', '');
        Array.from(document.querySelectorAll('.warp-pipe')).forEach(p => p.classList.remove('is-peeking'));

        state.inPipeTransit = false;
        state.isWarping = true;
        flash.classList.add('is-on');

        setTimeout(() => {
            state.x = clampX(targetPipe.x - window.innerWidth / 2);
            const alt = altitudeAt(targetPipe.x);
            world.style.transform = `translate3d(${-state.x}px, ${alt}px, 0)`;

            hero.style.transition = 'none';
            hero.style.setProperty('--pipe-y', '75px');
            void hero.offsetWidth;

            hero.style.transition = 'opacity 260ms ease';
            hero.style.setProperty('--pipe-y', '0px');
            hero.style.opacity = '1';

            flash.classList.remove('is-on');

            addScore(300, targetPipe.x, groundH() + 80, '🌀 WARPED! +300', true);
            announce.textContent = `Emerged at ${targetPipe.name}!`;

            setTimeout(() => {
                hero.style.transition = '';
                hero.style.setProperty('--pipe-y', '0px');
                state.isWarping = false;
            }, 300);
        }, reduceMotion ? 50 : 200);
    }

    btnPeekPrev?.addEventListener('click', () => peekPipe(-1));
    btnPeekNext?.addEventListener('click', () => peekPipe(1));
    btnPeekEmerge?.addEventListener('click', emergeFromPipe);

    function tryWarpDown() {
        if (state.inPipeTransit || state.isWarping || state.cinematic) return false;
        const heroX = state.x + heroScreenX() + 29;
        const warpPipes = Array.from(document.querySelectorAll('.warp-pipe'));

        for (const pipe of warpPipes) {
            const px = Number(pipe.dataset.x) || 0;
            if (Math.abs(heroX - (px + 42)) < 55) {
                enterPipeTransit(pipe);
                return true;
            }
        }
        return false;
    }

    // Clicking directly on a warp pipe also enters transit
    Array.from(document.querySelectorAll('.warp-pipe')).forEach(pipe => {
        pipe.addEventListener('click', () => {
            enterPipeTransit(pipe);
        });
    });

    /* =========================================================================
       LAYOUT
       ====================================================================== */
    function layoutWorld() {
        placeables = Array.from(document.querySelectorAll('[data-x]'));
        placeables.forEach((el) => {
            const x = Number(el.dataset.x) || 0;
            el.style.left = x + 'px';

            el.style.bottom = '';
            const alt = altitudeAt(x);
            if (alt <= 0) return;

            const base = parseFloat(getComputedStyle(el).bottom) || 0;
            el.style.bottom = (base + alt) + 'px';
        });

        zones.forEach((z) => {
            z.style.width = '100vw';
            z.style.left = (Number(z.dataset.x) - window.innerWidth / 2) + 'px';
        });

        world.style.width = WORLD_END + 'px';
        hero.style.left = heroScreenX() + 'px';

        const max = camMax();
        Array.from(railMarks.children).forEach((mark) => {
            const target = clampX(Number(mark.dataset.target) - window.innerWidth / 2);
            mark.style.left = ((target / max) * 100) + '%';
        });
    }

    /* =========================================================================
       ZONE RAIL
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

    /* =========================================================================
       ZONE SHEET
       ====================================================================== */
    function buildSheet() {
        zones.forEach((z, i) => {
            const x = Number(z.dataset.x);
            const row = document.createElement('li');
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sheet-row';
            btn.innerHTML =
                `<b>0${i + 1}</b><span>${ZONE_LABELS[z.dataset.zone]}</span>` +
                `<i class="fas fa-check" aria-hidden="true"></i>`;
            btn.addEventListener('click', () => {
                closeSheet();
                travelTo(x);
            });
            row.appendChild(btn);
            sheetList.appendChild(row);
        });
    }

    function openSheet() {
        sheet.hidden = false;
        state.paused = true;
        sheetList.querySelector('.sheet-row')?.focus();
    }

    function closeSheet() {
        sheet.hidden = true;
        state.paused = false;
    }

    $('btn-zones').addEventListener('click', () => {
        sheet.hidden ? openSheet() : closeSheet();
    });
    $('btn-zones-close').addEventListener('click', closeSheet);
    sheet.addEventListener('click', (e) => {
        if (e.target === sheet) closeSheet();
    });

    function travelTo(zoneX) {
        if (state.cinematic || state.isWarping || state.inPipeTransit) return;
        const x = zoneX - window.innerWidth / 2;
        startGame();
        closeOverlay();
        if (reduceMotion) {
            state.x = clampX(x);
            state.vx = 0;
            state.travelTo = null;
            requestAnimationFrame(focusNearestPanel);
        } else {
            state.travelTo = clampX(x);
        }
    }

    function camMax() {
        const endX = Number(zones[zones.length - 1].dataset.x);
        return Math.max(1, endX - window.innerWidth / 2);
    }

    const clampX = (x) => Math.max(0, Math.min(x, camMax()));

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
    const DOWN_KEYS = ['ArrowDown', 'KeyS'];
    const UP_KEYS = ['ArrowUp', 'KeyW', 'Space'];

    window.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

        // While in Pipe Transit:
        if (state.inPipeTransit) {
            if (LEFT_KEYS.includes(e.code)) {
                e.preventDefault();
                peekPipe(-1);
                return;
            }
            if (RIGHT_KEYS.includes(e.code)) {
                e.preventDefault();
                peekPipe(1);
                return;
            }
            if (UP_KEYS.includes(e.code)) {
                e.preventDefault();
                emergeFromPipe();
                return;
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                emergeFromPipe();
                return;
            }
            return;
        }

        if (e.code === 'Escape') {
            e.preventDefault();
            if (!sheet.hidden) { closeSheet(); return; }
            if (state.cinematic || state.isWarping) return;
            overlay.hasAttribute('hidden') || overlay.classList.contains('is-hiding')
                ? openOverlay()
                : closeOverlay();
            return;
        }

        if (/^Digit[1-8]$/.test(e.code)) {
            const idx = Number(e.code.slice(5)) - 1;
            if (zones[idx]) {
                e.preventDefault();
                travelTo(Number(zones[idx].dataset.x));
            }
            return;
        }

        if (DOWN_KEYS.includes(e.code)) {
            e.preventDefault();
            if (state.cinematic || state.isWarping) return;
            startGame();
            tryWarpDown();
            return;
        }

        if (LEFT_KEYS.includes(e.code) || RIGHT_KEYS.includes(e.code) || UP_KEYS.includes(e.code)) {
            e.preventDefault();
            if (state.cinematic || state.isWarping) return;
            startGame();
            if (UP_KEYS.includes(e.code)) jump();
            else held.add(e.code);
        }
    });

    window.addEventListener('keyup', (e) => held.delete(e.code));
    window.addEventListener('blur', () => held.clear());

    /* ---- Touch pad controls ---- */
    pad.querySelectorAll('.pad-btn').forEach((btn) => {
        const dir = btn.dataset.dir;
        const action = btn.dataset.action;

        const down = (e) => {
            e.preventDefault();
            btn.classList.add('is-down');
            btn.setPointerCapture?.(e.pointerId);

            if (state.inPipeTransit) {
                if (dir === '-1') peekPipe(-1);
                else if (dir === '1') peekPipe(1);
                else emergeFromPipe();
                return;
            }

            startGame();
            if (action === 'down') {
                tryWarpDown();
            } else if (dir) {
                held.add(dir === '1' ? 'ArrowRight' : 'ArrowLeft');
            } else {
                jump();
            }
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

    /* ---- Drag the world ---- */
    let drag = null;

    document.addEventListener('pointerdown', (e) => {
        if (state.cinematic || state.isWarping || state.inPipeTransit) return;
        if (e.target.closest('.hud, #pad, .sheet, .overlay, .super-mushroom, .pipe-transit-hud')) return;

        const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
        if (!coarsePointer && e.target.closest('.panel')) return;
        drag = {
            id: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            camera: state.x,
            active: false,
            dead: false
        };
    });

    window.addEventListener('pointermove', (e) => {
        if (!drag || e.pointerId !== drag.id || drag.dead) return;

        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        if (!drag.active) {
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
            if (Math.abs(dy) > Math.abs(dx)) { drag.dead = true; return; }

            drag.active = true;
            startGame();
        }

        state.travelTo = null;
        state.vx = 0;
        state.x = clampX(drag.camera - dx);
        state.facing = dx < 0 ? 1 : -1;
    });

    const endDrag = (e) => {
        if (!drag || (e && e.pointerId !== drag.id)) return;
        drag = null;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)');
    const syncPad = () => {
        pad.classList.toggle('is-on', coarse.matches);
        document.body.classList.toggle('has-pad', coarse.matches);
        hint.innerHTML = coarse.matches
            ? '<i class="fas fa-hand-pointer" aria-hidden="true"></i> SWIPE OR USE PAD · DOWN ON PIPES'
            : '<i class="fas fa-arrow-right" aria-hidden="true"></i> HOLD RIGHT TO WALK · DOWN ON PIPES TO WARP';
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
       ====================================================================== */
    let portalScreenX = 0;

    function runPortal() {
        if (state.cinematic || state.isWarping || state.inPipeTransit) return;

        held.clear();
        state.vx = 0;
        state.cinematic = 'open';
        document.body.classList.add('is-warping');

        portalScreenX = Math.min(
            heroScreenX() + 250,
            window.innerWidth - 150
        );
        portal.style.left = (portalScreenX - 64) + 'px';
        portal.hidden = false;

        void portal.offsetWidth;
        portal.classList.add('is-open');

        setTimeout(() => { state.cinematic = 'walk'; }, reduceMotion ? 120 : 620);
    }

    function stepPortal(dt) {
        const target = portalScreenX - heroScreenX() - 29;

        if (state.cinematic === 'walk') {
            const step = (reduceMotion ? 40 : 4.6) * dt;
            state.heroOffset = Math.min(state.heroOffset + step, target);
            state.facing = 1;

            if (state.heroOffset >= target - 0.5) {
                state.heroOffset = target;
                state.cinematic = 'enter';
            }
        } else if (state.cinematic === 'enter') {
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
            state.x = clampX(Number(zones[0].dataset.x) - window.innerWidth / 2);
            state.vx = 0;
            state.heroOffset = 0;
            state.warp = 1;
            state.facing = 1;
            state.score = 0;
            state.isGiant = false;
            state.giantUntil = 0;
            state.inPipeTransit = false;
            if (pipeTransitHud) pipeTransitHud.setAttribute('hidden', '');
            if (hud.score) hud.score.textContent = '000000';

            hero.style.opacity = '1';
            portal.classList.remove('is-open');
            document.body.classList.remove('is-warping');
            setTimeout(() => { portal.hidden = true; }, 300);

            hero.style.left = heroScreenX() + 'px';
            hero.style.setProperty('--warp', '1');
            hero.style.setProperty('--size', '1');
            hero.style.setProperty('--jump', '0px');
            hero.style.setProperty('--pipe-y', '0px');
            hero.style.setProperty('--face', '1');
            hero.classList.remove('is-walking', 'is-giant', 'is-giant-warning', 'is-invulnerable');
            held.clear();

            state.cinematic = null;
            updateHud(state.x + heroScreenX(), 0);

            initEnemies();
            initBlocks();

            openOverlay();
            flash.classList.remove('is-on');
        }, reduceMotion ? 60 : 240);
    }

    /* =========================================================================
       JUMP & COLLISION
       ====================================================================== */
    function jump() {
        if (performance.now() < state.jumpUntil) return;
        const dur = state.isGiant ? 580 : JUMP_MS;
        state.jumpUntil = performance.now() + dur;
    }

    function jumpOffset(now) {
        const left = state.jumpUntil - now;
        if (left <= 0) return 0;
        const dur = state.isGiant ? 580 : JUMP_MS;
        const h = state.isGiant ? 190 : JUMP_H;
        const t = 1 - left / dur;
        return Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * h;
    }

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
       MAIN GAME LOOP
       ====================================================================== */
    function frame(now) {
        requestAnimationFrame(frame);

        const dt = state.lastTime ? Math.min((now - state.lastTime) / 16.667, 3) : 1;
        state.lastTime = now;

        if (state.paused) return;

        /* ---- Movement ---- */
        if (state.cinematic) {
            stepPortal(dt);
        } else if (state.inPipeTransit || state.isWarping) {
            // Suspended during pipe transit / teleport
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
                state.vx *= Math.pow(FRICTION, dt);
                if (Math.abs(state.vx) < 0.12) state.vx = 0;
            }

            state.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, state.vx));
            state.x += state.vx * dt;
        }

        if (!state.cinematic && !state.isWarping && !state.inPipeTransit) state.x = clampX(state.x);

        /* ---- Camera ---- */
        const alt = altitudeAt(state.x + heroScreenX());
        world.style.transform = `translate3d(${-state.x}px, ${alt}px, 0)`;

        layers.stars.style.transform = `translate3d(${-state.x * 0.06}px, ${alt * 0.10}px, 0)`;
        layers.far.style.transform = `translate3d(${-state.x * 0.18}px, ${alt * 0.35}px, 0)`;
        layers.near.style.transform = `translate3d(${-state.x * 0.42}px, ${alt * 0.7}px, 0)`;

        /* ---- Giant Mode & Invulnerability Timers ---- */
        const giantLeft = state.giantUntil - now;
        if (giantLeft > 0) {
            state.isGiant = true;
            hero.classList.add('is-giant');
            hero.classList.toggle('is-giant-warning', giantLeft < 2500);
            hero.style.setProperty('--size', '1.85');
        } else if (state.isGiant) {
            state.isGiant = false;
            hero.classList.remove('is-giant', 'is-giant-warning');
            hero.style.setProperty('--size', '1');
        }

        const invulnLeft = state.invulnerableUntil - now;
        hero.classList.toggle('is-invulnerable', invulnLeft > 0);

        /* ---- Hero Rendering & Sky Vehicles (Balloon vs Floating Cyber Cloud) ---- */
        const worldX = state.x + heroScreenX();
        const platform = alt > 4 ? 0 : platformUnder(worldX);
        const lift = jumpOffset(now);
        const inSky = alt > 4;

        if (!state.isWarping && !state.inPipeTransit) {
            // When in the sky with Giant Cloud, elevate the Giant hero to stand ON the cloud deck
            if (inSky && state.isGiant) {
                hero.style.bottom = (groundH() + 140 + 36) + 'px';
                hero.style.opacity = '1';
            } else {
                hero.style.bottom = (groundH() + platform) + 'px';
                hero.style.opacity = inSky ? '0' : String(state.warp);
            }

            hero.style.left = (heroScreenX() + state.heroOffset) + 'px';
            hero.style.setProperty('--jump', lift + 'px');
            hero.style.setProperty('--face', state.facing < 0 ? '-1' : '1');
            hero.style.setProperty('--warp', String(state.warp));

            const walking = state.cinematic === 'walk'
                || (!state.cinematic && Math.abs(state.vx) > 0.5 && !inSky && lift === 0);
            hero.classList.toggle('is-walking', walking);
        }

        /* ---- Sky Vehicles Handling ---- */
        if (inSky) {
            if (state.isGiant) {
                // Giant mode rides the Cyber Cloud high in the sky!
                if (balloon) balloon.style.display = 'none';
                if (cyberCloud) {
                    cyberCloud.style.display = 'block';
                    cyberCloud.style.left = (worldX - 85) + 'px';
                    cyberCloud.style.bottom = (groundH() + alt + 140) + 'px';
                }
            } else {
                // Normal mode rides the Hot Air Balloon
                if (cyberCloud) cyberCloud.style.display = 'none';
                if (balloon) {
                    balloon.style.display = 'block';
                    balloon.style.left = (worldX - 53) + 'px';
                    balloon.style.bottom = (groundH() + alt) + 'px';
                }
            }
        } else {
            if (balloon) balloon.style.display = 'none';
            if (cyberCloud) cyberCloud.style.display = 'none';
        }

        /* ---- Interactive Blocks Collision & Giant Smash ---- */
        const heroCenterX = worldX + 29;
        const heroFeetY = groundH() + platform + lift;
        const heroHeadY = heroFeetY + (state.isGiant ? 160 : 92);

        if (!state.isWarping && !state.cinematic && !state.inPipeTransit && !inSky) {
            blocks.forEach((block) => {
                if (block.broken) return;

                const blockCenterX = block.x + 22;
                const blockBottom = groundH() + block.y;
                const blockTop = blockBottom + 44;

                const dx = Math.abs(heroCenterX - blockCenterX);
                const isOverlappingX = dx < (state.isGiant ? 42 : 28);

                // Giant mode: any contact shatters the brick immediately!
                if (state.isGiant && block.type === 'brick' && isOverlappingX) {
                    if (heroFeetY <= blockTop + 8 && heroHeadY >= blockBottom - 8) {
                        shatterBrick(block);
                        addScore(250, block.x, groundH() + block.y + 55, '💥 CRUSH! +250', true);
                        return;
                    }
                }

                // Head hit from underneath (jumping)
                if (lift > 20 && isOverlappingX) {
                    if (heroHeadY >= blockBottom && heroHeadY <= blockBottom + 40) {
                        if (now - block.lastHitTime > 300) {
                            block.lastHitTime = now;
                            block.el.classList.add('is-bumped');
                            setTimeout(() => block.el.classList.remove('is-bumped'), 120);

                            if (block.type === 'mystery' && !block.empty) {
                                block.empty = true;
                                block.el.classList.add('is-empty');
                                addScore(100, block.x, groundH() + block.y + 55, '+100');
                                if (block.hasMushroom) {
                                    spawnMushroom(block.x, block.y);
                                }
                            } else if (block.type === 'brick') {
                                if (state.isGiant) {
                                    shatterBrick(block);
                                    addScore(250, block.x, groundH() + block.y + 55, '💥 CRUSH! +250', true);
                                } else {
                                    addScore(50, block.x, groundH() + block.y + 55, '+50');
                                }
                            }
                        }
                    }
                }
            });
        }

        /* ---- Super Mushroom Collision ---- */
        mushrooms.forEach((m) => {
            if (!m.active) return;
            const mCenterX = m.x + 18;
            const mBottom = groundH() + m.y;
            const mTop = mBottom + 36;

            const dx = Math.abs(heroCenterX - mCenterX);
            if (dx < 32 && heroFeetY < mTop && heroHeadY > mBottom) {
                collectMushroom(m);
            }
        });

        /* ---- Arcade Enemies Patrol & Stomp Collision (Tight Hitboxes, No Phantom Damage) ---- */
        if (!inSky && !state.isWarping && !state.cinematic && !state.inPipeTransit) {
            enemies.forEach((enemy) => {
                if (enemy.dead) return;

                enemy.x += enemy.dir * enemy.speed * dt;
                if (enemy.x <= enemy.minX) {
                    enemy.x = enemy.minX;
                    enemy.dir = 1;
                } else if (enemy.x >= enemy.maxX) {
                    enemy.x = enemy.maxX;
                    enemy.dir = -1;
                }
                enemy.el.style.left = enemy.x + 'px';

                enemy.stepTime += dt;
                if (enemy.stepTime > 10) {
                    enemy.stepTime = 0;
                    enemy.el.classList.toggle('walk-step-1');
                    enemy.el.classList.toggle('walk-step-2');
                }

                // Accurate Collision with Hero
                const enemyCenterX = enemy.x + 18;
                const enemyBottomY = groundH();
                const enemyTopY = groundH() + 34;

                const dx = Math.abs(heroCenterX - enemyCenterX);
                const isOverlapX = dx < (state.isGiant ? 34 : 22);
                const isOverlapY = (heroFeetY < enemyTopY + 6) && (heroHeadY > enemyBottomY);

                if (isOverlapX && isOverlapY) {
                    if (state.isGiant) {
                        // Giant obliteration!
                        enemy.dead = true;
                        enemy.el.classList.add('is-blasted');
                        addScore(400, enemy.x, groundH() + 45, '💥 SMASH! +400', true);
                        setTimeout(() => enemy.el.remove(), 450);
                    } else if (lift > 0 || heroFeetY >= enemyTopY - 14) {
                        // Stomp success!
                        enemy.dead = true;
                        enemy.el.classList.add('is-stomped');
                        state.jumpUntil = performance.now() + 380; // Mini bounce!
                        addScore(200, enemy.x, groundH() + 45, '+200');
                        setTimeout(() => enemy.el.remove(), 400);
                    } else if (heroFeetY <= enemyTopY && now > state.invulnerableUntil) {
                        // Side hit damage & knockback
                        state.vx = -state.facing * 7.5;
                        state.invulnerableUntil = now + 1200;
                    }
                }
            });
        }

        checkWarpPipes();
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
        const rows = sheetList.children;
        let currentIdx = 0;

        zones.forEach((z, i) => {
            const zx = Number(z.dataset.x);
            const passed = (zx - state.x) <= centre;
            const current = z === inZone;
            if (passed) currentIdx = i;

            marks[i].classList.toggle('is-passed', passed);
            marks[i].classList.toggle('is-current', current);

            const row = rows[i]?.firstElementChild;
            if (row) {
                row.classList.toggle('is-passed', passed && !current);
                row.setAttribute('aria-current', String(current));
            }
        });

        zoneCount.textContent = `${currentIdx + 1}/${zones.length}`;

        if (key !== lastZone) {
            lastZone = key;
            if (key) announce.textContent = `Zone: ${ZONE_LABELS[key]}`;
        }
    }

    /* =========================================================================
       PROJECT FILTER
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
                void field.offsetWidth;
                field.classList.add('shake');
            }
        };

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
    let lastWidth = window.innerWidth;

    window.addEventListener('resize', () => {
        const worldCentre = state.x + lastWidth / 2;

        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            layoutWorld();
            lastWidth = window.innerWidth;
            state.x = clampX(worldCentre - lastWidth / 2);
        }, 150);
    });

    buildRail();
    buildSheet();
    layoutWorld();
    initEnemies();
    initBlocks();

    state.x = clampX(Number(zones[0].dataset.x) - window.innerWidth / 2);

    requestAnimationFrame(frame);

    const hash = location.hash.replace('#', '');
    if (hash) {
        const z = zones.find((el) => el.dataset.zone === hash);
        if (z) {
            state.x = clampX(Number(z.dataset.x) - window.innerWidth / 2);
            startGame();
        }
    }
})();
