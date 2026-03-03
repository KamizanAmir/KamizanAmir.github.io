document.addEventListener("DOMContentLoaded", function () {

    // --- 1. Audio & Door Animation ---
    const openBtn = document.getElementById('open-btn');
    const doorOverlay = document.getElementById('door-overlay');
    const bgMusic = document.getElementById('bg-music');
    const musicToggle = document.getElementById('music-toggle');
    let isPlaying = false;

    if (openBtn && doorOverlay) {
        openBtn.addEventListener('click', function () {
            doorOverlay.classList.add('door-open');
            document.body.classList.remove('locked');

            if (bgMusic) {
                bgMusic.play().then(() => {
                    isPlaying = true;
                    musicToggle.classList.remove('hidden');
                }).catch(e => console.log("Audio play failed:", e));
            }

            setTimeout(() => {
                doorOverlay.style.display = 'none';
            }, 1500);
        });
    }

    if (musicToggle && bgMusic) {
        musicToggle.addEventListener('click', function () {
            if (isPlaying) {
                bgMusic.pause();
                musicToggle.innerHTML = "🔇";
            } else {
                bgMusic.play();
                musicToggle.innerHTML = "🔊";
            }
            isPlaying = !isPlaying;
        });
    }

    // --- 2. Scroll Animation Observer ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    const observerOptions = { root: null, rootMargin: '0px', threshold: 0.15 };

    const observerCallback = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    animatedElements.forEach(element => observer.observe(element));

    setTimeout(() => {
        animatedElements.forEach(element => {
            const rect = element.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                element.classList.add('is-visible');
            }
        });
    }, 100);

    // --- 3. Fetch Real Wishes from Google Sheets ---
    const googleSheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlYvA3WnmjaEHiRdVmX9-5BoZnoffaJdKlto_vDdc0Pc9-mDulKpsgX_gILSKDtvHfH4RSpen0r_6S/pub?gid=300194188&single=true&output=csv";
    const slider = document.getElementById('wishes-slider');
    let sliderInterval;

    function fetchWishes() {
        fetch(googleSheetCSVUrl)
            .then(response => response.text())
            .then(csvText => {
                if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html') || csvText.includes('pageUrl:')) {
                    slider.innerHTML = `<div class="slide"><p class="wish-text">Ralat: Sila pastikan Sheet diterbitkan sebagai CSV.</p></div>`;
                    return;
                }

                function parseCSV(str) {
                    const arr = [];
                    let quote = false;
                    let col, c;
                    for (let row = col = c = 0; c < str.length; c++) {
                        let cc = str[c], nc = str[c + 1];
                        arr[row] = arr[row] || [];
                        arr[row][col] = arr[row][col] || '';
                        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
                        if (cc == '"') { quote = !quote; continue; }
                        if (cc == ',' && !quote) { ++col; continue; }
                        if (cc == '\r' && nc == '\n' && !quote) { ++row; col = 0; ++c; continue; }
                        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
                        if (cc == '\r' && !quote) { ++row; col = 0; continue; }
                        arr[row][col] += cc;
                    }
                    return arr;
                }

                const rows = parseCSV(csvText).slice(1);
                let html = '';

                rows.forEach(columns => {
                    if (columns.length >= 3) {
                        const name = columns[1].trim();
                        const message = columns[2].trim();
                        if (name && message) {
                            html += `
                            <div class="slide">
                                <p class="wish-text">"${message}"</p>
                                <p class="wish-author">- ${name}</p>
                            </div>`;
                        }
                    }
                });

                if (html !== '') {
                    slider.innerHTML = html;
                    startSlider();
                } else {
                    slider.innerHTML = `<div class="slide"><p class="wish-text">Belum ada ucapan.</p></div>`;
                }
            })
            .catch(error => {
                console.error('Error fetching wishes:', error);
                slider.innerHTML = `<div class="slide"><p class="wish-text">Ralat memuat turun ucapan.</p></div>`;
            });
    }

    function startSlider() {
        if (sliderInterval) clearInterval(sliderInterval);

        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        let currentIndex = 0;

        if (totalSlides > 1) {
            sliderInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % totalSlides;
                slider.style.transform = `translateX(-${currentIndex * 100}%)`;
            }, 3500);
        }
    }

    fetchWishes();

    // --- 5. Modern Background Form Submissions (For GitHub Hosting) ---
    const rsvpForm = document.getElementById('rsvp-form');
    const rsvpBtn = document.getElementById('rsvp-btn');

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Stop standard form submission
            rsvpBtn.innerText = "Menghantar...";
            rsvpBtn.disabled = true;

            const rsvpURL = "https://docs.google.com/forms/d/e/1FAIpQLSdWogh4C8y7hR5Uif-gODe0IK9s92VFaj9WD2E3t3GLXF3Z2w/formResponse";
            const formData = new FormData(rsvpForm);

            fetch(rsvpURL, {
                method: "POST",
                mode: "no-cors",
                body: formData
            }).then(() => {
                alert('Terima kasih! RSVP anda telah disimpan.');
                rsvpForm.reset();
                rsvpBtn.innerText = "Hantar RSVP";
                rsvpBtn.disabled = false;
            }).catch(error => {
                alert('Ralat. Sila cuba lagi.');
                rsvpBtn.innerText = "Hantar RSVP";
                rsvpBtn.disabled = false;
            });
        });
    }

    const wishForm = document.getElementById('wish-form');
    const wishBtn = document.getElementById('wish-btn');

    if (wishForm) {
        wishForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Stop standard form submission
            wishBtn.innerText = "Menghantar...";
            wishBtn.disabled = true;

            const ucapanURL = "https://docs.google.com/forms/d/e/1FAIpQLSe9x94PBLCzKXAcSVr2XNW3ZzDrIGBIyiUFgtVlIAryH4QINw/formResponse";
            const formData = new FormData(wishForm);

            fetch(ucapanURL, {
                method: "POST",
                mode: "no-cors",
                body: formData
            }).then(() => {
                alert('Terima kasih atas ucapan manis anda!');
                wishForm.reset();
                wishBtn.innerText = "Hantar Ucapan";
                wishBtn.disabled = false;

                // Reload the slider to show the new wish
                setTimeout(() => {
                    fetchWishes();
                }, 2000);
            }).catch(error => {
                alert('Ralat. Sila cuba lagi.');
                wishBtn.innerText = "Hantar Ucapan";
                wishBtn.disabled = false;
            });
        });
    }
});
