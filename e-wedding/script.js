document.addEventListener("DOMContentLoaded", function () {

    // --- 1. Audio & Door Animation with Fade-in ---
    const openBtn = document.getElementById('open-btn');
    const doorOverlay = document.getElementById('door-overlay');
    const bgMusic = document.getElementById('bg-music');
    const musicToggle = document.getElementById('music-toggle');
    let isPlaying = false;

    function fadeInAudio(audioElement, duration) {
        audioElement.volume = 0;
        audioElement.play().then(() => {
            isPlaying = true;
            musicToggle.classList.remove('hidden');

            let currentVolume = 0;
            const targetVolume = 1;
            const intervalTime = 50;
            const volumeStep = targetVolume / (duration / intervalTime);

            const fadeInterval = setInterval(() => {
                if (currentVolume < targetVolume) {
                    currentVolume += volumeStep;
                    audioElement.volume = Math.min(1, currentVolume);
                } else {
                    clearInterval(fadeInterval);
                }
            }, intervalTime);

        }).catch(e => console.log("Audio play failed:", e));
    }

    if (openBtn && doorOverlay) {
        openBtn.addEventListener('click', function () {
            doorOverlay.classList.add('door-open');
            document.body.classList.remove('locked');

            if (bgMusic) {
                fadeInAudio(bgMusic, 2000);
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

    // --- 3. CSV Parser Helper Function ---
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

    // --- 4. Fetch Real Wishes from Google Sheets ---
    const googleSheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlYvA3WnmjaEHiRdVmX9-5BoZnoffaJdKlto_vDdc0Pc9-mDulKpsgX_gILSKDtvHfH4RSpen0r_6S/pub?gid=300194188&single=true&output=csv";

    function fetchWishes() {
        const commentsContainer = document.getElementById('wishes-container');

        if (!commentsContainer) return;

        // Helper function to format the timestamp cleanly
        function formatTimestamp(rawTimestamp) {
            const parts = rawTimestamp.split(' ');
            if (parts.length < 2) return ""; // Invalid date format
            const datePart = parts[0]; // e.g., "3/3/2026"
            const timePart = parts[1]; // e.g., "12:57:55"
            const dateParts = datePart.split('/');
            if (dateParts.length < 3) return ""; // Invalid date part format
            const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedDate = `${dateParts[0]} ${monthNames[parseInt(dateParts[1])]} ${dateParts[2]}`;
            let [hours, minutes] = timePart.split(':');
            hours = parseInt(hours);
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // Handle '0' hour as '12'
            return `${formattedDate}, ${hours}:${minutes} ${ampm}`;
        }

        fetch(googleSheetCSVUrl)
            .then(response => response.text())
            .then(csvText => {
                if (csvText.includes('<!DOCTYPE html>') || csvText.includes('<html') || csvText.includes('pageUrl:')) {
                    commentsContainer.innerHTML = `<div class="comment-item"><p class="wish-text">Ralat: Sila pastikan Sheet diterbitkan sebagai CSV.</p></div>`;
                    return;
                }

                const rows = parseCSV(csvText).slice(1).reverse();
                let html = '';

                rows.forEach(columns => {
                    if (columns.length >= 3) {
                        const name = columns[1].trim();
                        const message = columns[2].trim();
                        const rawTime = columns[0].trim();
                        const formattedTime = formatTimestamp(rawTime);
                        const initial = name.charAt(0).toUpperCase(); // Extract first initial

                        if (name && message) {
                            html += `
                            <div class="comment-item">
                                <div class="comment-header"> <div class="profile-icon"><span>${initial}</span></div> <div class="comment-details">
                                        <p class="wish-author">${name}</p>
                                        <p class="comment-timestamp">${formattedTime}</p>
                                    </div>
                                </div>
                                <p class="wish-text">${message}</p>
                            </div>`;
                        }
                    }
                });

                if (html !== '') {
                    commentsContainer.innerHTML = html;
                } else {
                    commentsContainer.innerHTML = `<div class="comment-item"><p class="wish-text">Belum ada ucapan.</p></div>`;
                }
            })
            .catch(error => {
                console.error('Error fetching wishes:', error);
                if (commentsContainer) {
                    commentsContainer.innerHTML = `<div class="comment-item"><p class="wish-text">Ralat memuat turun ucapan.</p></div>`;
                }
            });
    }

    fetchWishes();

    // --- 5. Countdown and Total Pax Calculation ---
    function startCountdown() {
        const eventDate = new Date("April 26, 2026 11:30:00").getTime();
        const countdownContainer = document.getElementById("countdown");

        const countdownInterval = setInterval(function () {
            const now = new Date().getTime();
            const distance = eventDate - now;

            if (distance < 0) {
                clearInterval(countdownInterval);
                document.getElementById("days").innerText = "00";
                document.getElementById("hours").innerText = "00";
                document.getElementById("minutes").innerText = "00";
                document.getElementById("seconds").innerText = "00";
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById("days").innerText = days.toString().padStart(2, '0');
            document.getElementById("hours").innerText = hours.toString().padStart(2, '0');
            document.getElementById("minutes").innerText = minutes.toString().padStart(2, '0');
            document.getElementById("seconds").innerText = seconds.toString().padStart(2, '0');

            // Set to urgent state (red and bold) if 49 days (7 weeks) or less remaining
            if (days <= 49) {
                countdownContainer.classList.add("countdown-urgent");
            } else {
                countdownContainer.classList.remove("countdown-urgent");
            }
        }, 1000);
    }

    startCountdown();

    function fetchRSVPPax() {
        const rsvpSheetCSVUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlYvA3WnmjaEHiRdVmX9-5BoZnoffaJdKlto_vDdc0Pc9-mDulKpsgX_gILSKDtvHfH4RSpen0r_6S/pub?gid=700668432&single=true&output=csv";

        fetch(rsvpSheetCSVUrl)
            .then(response => response.text())
            .then(csvText => {
                const rows = parseCSV(csvText).slice(1);
                let hadirTotal = 0;
                let tidakHadirTotal = 0;

                rows.forEach(columns => {
                    if (columns.length >= 4) {
                        // Index 2 is Kehadiran, Index 3 is Jumlah Pax
                        const kehadiran = columns[2] ? columns[2].trim().toLowerCase() : "";
                        const paxStr = columns[3] ? columns[3].trim() : "0";
                        const pax = parseInt(paxStr, 10) || 0;

                        if (kehadiran === "hadir") {
                            hadirTotal += pax;
                        } else if (kehadiran === "tidak hadir" || kehadiran === "tidak") {
                            tidakHadirTotal += (pax > 0 ? pax : 1);
                        }
                    }
                });

                document.getElementById('total-hadir').innerText = hadirTotal;
                document.getElementById('total-tidak-hadir').innerText = tidakHadirTotal;
            })
            .catch(err => console.error("Error fetching RSVP totals:", err));
    }

    fetchRSVPPax();

    // --- 6. Modal and Menu Logic ---
    window.openModal = function (id) {
        document.getElementById(id).style.display = 'flex';
    };

    window.closeModal = function (id) {
        document.getElementById(id).style.display = 'none';
    };

    // Close modal when clicking outside of the content box
    window.onclick = function (event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    }

    // Download Apple/Outlook Calendar Event (.ics)
    window.downloadICS = function () {
        const icsData = "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Walimatul Urus Faridah & Adam\nDTSTART:20260426T033000Z\nDTEND:20260426T080000Z\nLOCATION:No 147, Kg. Sg. Star, 34140 Rantau Panjang, Selama, Perak\nDESCRIPTION:Majlis Perkahwinan Teh Faridah & Adam Safwan\nEND:VEVENT\nEND:VCALENDAR";
        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', 'majlis_perkahwinan.ics');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- 7. Sparkling/Love Animation on Scroll ---
    const particlesContainer = document.getElementById('particles-container');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function () {
        let st = window.pageYOffset || document.documentElement.scrollTop;
        if (Math.abs(st - lastScrollTop) > 30) {
            createParticle();
            lastScrollTop = st;
        }
    });

    function createParticle() {
        if (!particlesContainer) return;
        const particle = document.createElement('div');
        particle.classList.add('particle');

        const items = ['💖', '✨', '🌸', '💕'];
        particle.innerText = items[Math.floor(Math.random() * items.length)];

        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.animationDuration = (Math.random() * 2 + 3) + 's';
        particle.style.fontSize = (Math.random() * 1 + 1) + 'rem';

        particlesContainer.appendChild(particle);

        setTimeout(() => {
            particle.remove();
        }, 5000);
    }

    // --- 8. Modern Background Form Submissions (Fetch API) ---
    const rsvpForm = document.getElementById('rsvp-form');
    const rsvpBtn = document.getElementById('rsvp-btn');

    if (rsvpForm) {
        rsvpForm.addEventListener('submit', function (e) {
            e.preventDefault();

            rsvpBtn.innerText = "Menghantar...";
            rsvpBtn.disabled = true;

            const rsvpURL = "https://docs.google.com/forms/d/e/1FAIpQLSdWogh4C8y7hR5Uif-gODe0IK9s92VFaj9WD2E3t3GLXF3Z2w/formResponse";

            const formData = new FormData(rsvpForm);
            const data = new URLSearchParams();
            for (const pair of formData) {
                data.append(pair[0], pair[1]);
            }

            fetch(rsvpURL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: data
            }).then(() => {
                alert('Terima kasih! RSVP anda telah disimpan.');
                rsvpForm.reset();
                rsvpBtn.innerText = "Hantar RSVP";
                rsvpBtn.disabled = false;
                closeModal('modal-rsvp');
                // Refresh pax count after submission
                fetchRSVPPax();
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
            e.preventDefault();

            wishBtn.innerText = "Menghantar...";
            wishBtn.disabled = true;

            const ucapanURL = "https://docs.google.com/forms/d/e/1FAIpQLSe9x94PBLCzKXAcSVr2XNW3ZzDrIGBIyiUFgtVlIAryH4QINw/formResponse";

            const formData = new FormData(wishForm);
            const data = new URLSearchParams();
            for (const pair of formData) {
                data.append(pair[0], pair[1]);
            }

            fetch(ucapanURL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: data
            }).then(() => {
                alert('Terima kasih atas ucapan manis anda!');
                window.location.reload();

            }).catch(error => {
                alert('Ralat. Sila cuba lagi.');
                wishBtn.innerText = "Hantar Ucapan";
                wishBtn.disabled = false;
            });
        });
    }

    // --- 9. Pre-Wedding Gallery Slider ---
    function initGallerySlider() {
        const slides = document.querySelectorAll('.gallery-slide');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        let currentSlide = 0;
        let slideInterval;

        if (slides.length === 0) return;

        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.remove('active');
                if (i === index) {
                    slide.classList.add('active');
                }
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        }

        // Reset interval when user clicks manually so it doesn't double-skip
        function resetInterval() {
            clearInterval(slideInterval);
            slideInterval = setInterval(nextSlide, 4000); // Auto slide every 4 seconds
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                nextSlide();
                resetInterval();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                prevSlide();
                resetInterval();
            });
        }

        // Start auto slide
        slideInterval = setInterval(nextSlide, 4000);
    }

    initGallerySlider();

});
