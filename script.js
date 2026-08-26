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