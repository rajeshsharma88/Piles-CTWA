const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
});

// Close menu when any link is clicked (optional)
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('open');
    });
});



// ============================================================ //
// PRODUCT SLIDER
// ============================================================ //
const slides = document.querySelectorAll('.slide');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
let currentIndex = 0;
const totalSlides = slides.length;

function goToSlide(index) {
    slides.forEach(s => s.classList.remove('active'));
    slides[index].classList.add('active');
    currentIndex = index;
}

function nextSlide() {
    goToSlide((currentIndex + 1) % totalSlides);
}

function prevSlide() {
    goToSlide((currentIndex - 1 + totalSlides) % totalSlides);
}

nextBtn.addEventListener('click', nextSlide);
prevBtn.addEventListener('click', prevSlide);

// Auto-play
let autoPlay = setInterval(nextSlide, 5000);
const sliderContainer = document.getElementById('sliderContainer');
sliderContainer.addEventListener('mouseenter', () => clearInterval(autoPlay));
sliderContainer.addEventListener('mouseleave', () => {
    autoPlay = setInterval(nextSlide, 5000);
});

// Touch support for mobile
let touchStartX = 0;
let touchEndX = 0;

sliderContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
});

sliderContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            nextSlide();
        } else {
            prevSlide();
        }
    }
}

// ============================================================ //
// FAQ TOGGLE
// ============================================================ //
function toggleFAQ(element) {
    const item = element.parentElement;
    const isActive = item.classList.contains('active');

    // Close all FAQs
    document.querySelectorAll('.faq-item').forEach(el => {
        el.classList.remove('active');
    });

    // If it wasn't active, open it
    if (!isActive) {
        item.classList.add('active');
    }
}

// ============================================================ //
// SMOOTH SCROLL FOR FOOTER LINKS
// ============================================================ //
document.querySelectorAll('.footer-links a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ============================================================ //
// SHORTS AUTO-SCROLL SLIDER
// ============================================================ //
(function () {
    const track = document.getElementById('shortsTrack');
    const prevBtn = document.getElementById('shortsPrev');
    const nextBtn = document.getElementById('shortsNext');
    if (!track) return;

    let isPaused = false;
    let resumeTimer = null;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    function getStep() {
        const card = track.querySelector('.shorts-card');
        if (!card) return 280;
        const gap = 22;
        return card.offsetWidth + gap;
    }

    function scrollNext() {
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 15) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: getStep(), behavior: 'smooth' });
        }
    }

    function scrollPrev() {
        if (track.scrollLeft <= 15) {
            track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
        } else {
            track.scrollBy({ left: -getStep(), behavior: 'smooth' });
        }
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            scrollNext();
            pauseAutoScroll(4000);
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            scrollPrev();
            pauseAutoScroll(4000);
        });
    }

    function pauseAutoScroll(duration = 3500) {
        isPaused = true;
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
            isPaused = false;
        }, duration);
    }

    // Auto-scroll every 3 seconds smoothly
    const autoScrollTimer = setInterval(() => {
        if (!isPaused && !isDown) {
            scrollNext();
        }
    }, 3000);

    // Pause on hover
    track.addEventListener('mouseenter', () => { isPaused = true; });
    track.addEventListener('mouseleave', () => { isPaused = false; });

    // Touch support for mobile
    track.addEventListener('touchstart', () => {
        isPaused = true;
        clearTimeout(resumeTimer);
    }, { passive: true });

    track.addEventListener('touchend', () => {
        pauseAutoScroll(3000);
    }, { passive: true });

    // Drag-to-scroll support for desktop mouse
    track.addEventListener('mousedown', (e) => {
        isDown = true;
        isPaused = true;
        startX = e.pageX - track.offsetLeft;
        scrollLeft = track.scrollLeft;
        clearTimeout(resumeTimer);
    });

    window.addEventListener('mouseup', () => {
        if (isDown) {
            isDown = false;
            pauseAutoScroll(3000);
        }
    });

    track.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - track.offsetLeft;
        const walk = (x - startX) * 1.5;
        track.scrollLeft = scrollLeft - walk;
    });
})();
