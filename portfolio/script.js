document.addEventListener('DOMContentLoaded', () => {

    const world = document.getElementById('world');
    const hero = document.getElementById('hero');
    const startScreen = document.getElementById('start-screen');
    const altVal = document.getElementById('alt-val');
    const expVal = document.getElementById('exp-val');
    const obstacles = document.querySelectorAll('.obstacle');
    const restartBtn = document.getElementById('restart-btn');
    const balloonVehicle = document.getElementById('balloon-vehicle');

    // Controls
    const btnRight = document.getElementById('btn-right');
    const btnLeft = document.getElementById('btn-left');
    const btnJump = document.getElementById('btn-jump');

    // STATE
    let cameraX = 0;
    let cameraY = 0;
    let heroScreenLeft = window.innerWidth < 768 ? 50 : 200;
    let isGameStarted = false;
    let isJumping = false;
    let moveInterval = null;
    let gameMode = 'WALKING'; // 'WALKING', 'FLYING', 'ROOF_WALK'

    // CONFIG
    const speed = 20;
    const maxScroll = 9500;
    const groundLevel = 64;
    const missionCompleteX = 9000;

    // BALLOON CONFIG
    const balloonTriggerX = 5000;
    const landingX = 7000;
    const maxAltitude = 600;

    // --- INITIALIZATION ---
    initPortfolioLogic();
    initContactFormLogic();

    // --- INPUT HANDLERS ---
    window.addEventListener('wheel', (e) => {
        if (!isGameStarted) startGame();
        let dir = e.deltaY > 0 ? 1 : -1;
        handleMovement(dir);
    });

    window.addEventListener('keydown', (e) => {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
        if (!isGameStarted && (e.code === 'ArrowRight' || e.code === 'Space')) startGame();

        switch (e.code) {
            case 'ArrowRight': handleMovement(1); hero.classList.remove('face-left'); break;
            case 'ArrowLeft': handleMovement(-1); hero.classList.add('face-left'); break;
            case 'Space': if (gameMode !== 'FLYING') performJump(); break;
        }
    });

    const startMoving = (dir) => {
        if (!isGameStarted) startGame();
        if (moveInterval) clearInterval(moveInterval);
        if (dir === -1) hero.classList.add('face-left'); else hero.classList.remove('face-left');
        moveInterval = setInterval(() => { handleMovement(dir); }, 30);
    };
    const stopMoving = () => { if (moveInterval) clearInterval(moveInterval); hero.classList.remove('walk'); };

    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving(1); });
    btnRight.addEventListener('touchend', stopMoving);
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving(-1); });
    btnLeft.addEventListener('touchend', stopMoving);
    btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameMode !== 'FLYING') performJump(); });

    restartBtn.addEventListener('click', () => { location.reload(); });

    // --- CORE GAME LOGIC ---

    function startGame() {
        if (isGameStarted) return;
        isGameStarted = true;
        startScreen.style.opacity = '0';
        setTimeout(() => { startScreen.style.display = 'none'; }, 500);
    }

    function handleMovement(direction) {
        let nextCameraX = cameraX + (direction * speed);
        if (nextCameraX < 0) nextCameraX = 0;
        if (nextCameraX > maxScroll) nextCameraX = maxScroll;

        let heroWorldPos = nextCameraX + heroScreenLeft;

        // --- MODE SWITCHING ---

        // 1. Enter Flight (From Walking)
        if (gameMode === 'WALKING' && heroWorldPos >= (balloonTriggerX - 50) && heroWorldPos < landingX) {
            gameMode = 'FLYING';
            hero.style.opacity = '0'; // Hide Hero
        }

        // 2. Abort Flight (Go Back Left)
        if (gameMode === 'FLYING' && heroWorldPos < (balloonTriggerX - 50)) {
            gameMode = 'WALKING';
            hero.style.opacity = '1';
            cameraY = 0;
            // Reset balloon to ground
            balloonVehicle.style.bottom = '60px';
            balloonVehicle.style.left = balloonTriggerX + 'px';
        }

        // 3. Land on Roof (Reaching Skyscraper)
        if (gameMode === 'FLYING' && heroWorldPos >= landingX) {
            gameMode = 'ROOF_WALK';
            hero.style.opacity = '1';
            cameraY = maxAltitude;
            // Hide balloon below screen
            balloonVehicle.style.bottom = '-500px';
            balloonVehicle.style.left = landingX + 'px';
        }

        // 4. Go Back to Flight (Leaving Skyscraper Left)
        if (gameMode === 'ROOF_WALK' && heroWorldPos < landingX) {
            gameMode = 'FLYING';
            hero.style.opacity = '0'; // Hide Hero
            // Balloon will reappear via the continuous update loop below
        }

        // --- POSITION UPDATES ---

        cameraX = nextCameraX;

        if (gameMode === 'FLYING') {
            // Ascend/Descend Camera logic
            let flightDist = landingX - balloonTriggerX;
            let currentDist = heroWorldPos - balloonTriggerX;
            let flightProgress = currentDist / flightDist;

            if (flightProgress < 1.0) {
                cameraY = flightProgress * maxAltitude;
            } else {
                cameraY = maxAltitude;
            }

            // CRITICAL FIX: Counter-act World Gravity
            // As cameraY goes UP, the world moves DOWN.
            // We increase balloon bottom by cameraY to keep it visually fixed on screen.
            balloonVehicle.style.bottom = (cameraY + 60) + 'px';

            // Lock balloon Horizontal to Hero
            balloonVehicle.style.left = (heroWorldPos - 55) + 'px';
        }
        else if (gameMode === 'ROOF_WALK') {
            cameraY = maxAltitude;
        }
        else {
            cameraY = 0;
        }

        world.style.transform = `translate(${-cameraX}px, ${cameraY}px)`;

        // --- HUD & ANIMATION ---

        let percent = Math.min(100, Math.floor((heroWorldPos / missionCompleteX) * 100));
        expVal.innerText = percent + '%';
        altVal.innerText = Math.floor(cameraY) + 'ft';

        if (gameMode === 'WALKING' || gameMode === 'ROOF_WALK') {
            hero.classList.add('walk');
            checkObstacles();
            if (!moveInterval) {
                clearTimeout(window.walkTimeout);
                window.walkTimeout = setTimeout(() => { hero.classList.remove('walk'); }, 100);
            }
        }
    }

    function performJump() {
        if (isJumping) return;
        isJumping = true;
        hero.classList.add('jump');
        setTimeout(() => {
            hero.classList.remove('jump');
            isJumping = false;
            checkObstacles();
        }, 500);
    }

    function checkObstacles() {
        if (isJumping) return;
        let onObstacle = false;
        heroScreenLeft = window.innerWidth < 768 ? 50 : 200;
        let heroWorldPos = cameraX + heroScreenLeft;

        obstacles.forEach(obs => {
            let obsLeft = parseInt(obs.style.left);
            let obsWidth = obs.offsetWidth;
            let obsHeight = parseInt(obs.getAttribute('data-height'));

            // Ignore skyscraper collision if we are already on the roof mode
            if (gameMode === 'ROOF_WALK' && obs.classList.contains('skyscraper')) {
                return;
            }

            if ((heroWorldPos + 30) > obsLeft && (heroWorldPos + 10) < (obsLeft + obsWidth)) {
                hero.style.bottom = (groundLevel + obsHeight) + 'px';
                onObstacle = true;
            }
        });

        if (!onObstacle) {
            hero.style.bottom = groundLevel + 'px';
        }
    }

    window.addEventListener('resize', () => {
        heroScreenLeft = window.innerWidth < 768 ? 50 : 200;
        checkObstacles();
    });

    // --- HELPERS ---
    function initPortfolioLogic() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        const portfolioItems = document.querySelectorAll('.g-item');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const filterValue = this.getAttribute('data-filter');
                portfolioItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    if (filterValue === 'all' || category === filterValue) {
                        item.classList.remove('hide');
                        item.classList.add('show');
                    } else {
                        item.classList.remove('show');
                        item.classList.add('hide');
                    }
                });
            });
        });
    }

    function initContactFormLogic() {
        const contactForm = document.querySelector('.retro-form');
        if (!contactForm) return;
        contactForm.addEventListener('submit', function (e) {
            let valid = true;
            const nameField = document.getElementById('name');
            const emailField = document.getElementById('email');
            const subjectField = document.getElementById('subject');
            const messageField = document.getElementById('message');
            [nameField, emailField, subjectField, messageField].forEach(resetField);
            if (nameField.value.trim().length < 2) { highlightError(nameField, 'NAME TOO SHORT'); valid = false; }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value.trim())) { highlightError(emailField, 'BAD EMAIL'); valid = false; }
            if (subjectField.value.trim().length < 3) { highlightError(subjectField, 'SUBJECT TOO SHORT'); valid = false; }
            if (messageField.value.trim().length < 10) { highlightError(messageField, 'MSG TOO SHORT'); valid = false; }
            if (!valid) { e.preventDefault(); } else {
                const submitBtn = contactForm.querySelector('.submit-btn');
                submitBtn.innerHTML = 'SENDING...';
                submitBtn.disabled = true;
            }
        });
    }
    function highlightError(field, message) {
        const parent = field.parentElement;
        if (parent.querySelector('.error-message')) parent.querySelector('.error-message').remove();
        field.style.borderColor = '#ff4d4d';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerText = `! ${message}`;
        parent.appendChild(errorDiv);
        field.style.animation = 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both';
        field.addEventListener('animationend', () => { field.style.animation = ''; }, { once: true });
    }
    function resetField(field) {
        field.style.borderColor = '#555';
        const parent = field.parentElement;
        if (parent.querySelector('.error-message')) parent.querySelector('.error-message').remove();
    }
});
