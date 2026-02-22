// ============================================
// CHATTER LANDING PAGE - INTERACTIVITY
// ============================================

// Smooth scroll behavior for anchor links
document.addEventListener('DOMContentLoaded', function () {
    initializeNavigation();
    initializeScrollAnimations();
    initializeButtons();
    initializeHamburger();
    initializeIntersectionObserver();
});

// ============================================
// NAVIGATION FUNCTIONALITY
// ============================================

function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu.style.display === 'flex') {
                    navMenu.style.display = 'none';
                }
            }
        });
    });
}

// ============================================
// HAMBURGER MENU
// ============================================

function initializeHamburger() {
    const hamburger = document.querySelector('.hamburger');
    const navWrapper = document.querySelector('.nav-wrapper');
    const navLinks = document.querySelectorAll('.nav-link');

    if (!hamburger || !navWrapper) return;

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function (e) {
        e.stopPropagation();
        hamburger.classList.toggle('active');
        navWrapper.classList.toggle('active');
    });

    // Close menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navWrapper.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.navbar')) {
            hamburger.classList.remove('active');
            navWrapper.classList.remove('active');
        }
    });

    // Close menu on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hamburger.classList.remove('active');
            navWrapper.classList.remove('active');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            hamburger.classList.remove('active');
            navWrapper.classList.remove('active');
        }
    });
}

// ============================================
// BUTTON INTERACTIONS
// ============================================

function initializeButtons() {
    const downloadButtons = document.querySelectorAll('.nav-download, .hero-download, .cta-download');

    downloadButtons.forEach(button => {
        button.addEventListener('click', function () {
            const link = document.createElement('a');
            link.href = './app-release.apk';
            link.download = 'Chatter-App.apk';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification('Download started! 📱', 'success');
        });
    });

    // Add ripple effect to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function () {
            this.style.cursor = 'pointer';
        });
    });
}

// ============================================
// SCROLL ANIMATIONS
// ============================================

function initializeScrollAnimations() {
    const elements = document.querySelectorAll('.feature-card, .why-card, .testimonial-card, .showcase-item');

    elements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s forwards`;
    });
}

// ============================================
// INTERSECTION OBSERVER
// ============================================

function initializeIntersectionObserver() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in-up');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all animatable elements
    const animatableElements = document.querySelectorAll('.feature-card, .why-card, .testimonial-card, .showcase-item');
    animatableElements.forEach(element => observer.observe(element));
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        animation: slideInRight 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    `;

    const bgColor = type === 'success' ? '#00D4C2' : type === 'error' ? '#ef4444' : '#1a1f2e';
    notification.style.backgroundColor = bgColor;
    notification.style.color = 'white';
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// SCROLL EFFECT - NAVBAR
// ============================================

window.addEventListener('scroll', function () {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 10) {
        navbar.style.boxShadow = 'var(--shadow-md)';
    } else {
        navbar.style.boxShadow = 'var(--shadow-sm)';
    }
});

// ============================================
// COUNTER ANIMATION FOR STATS
// ============================================

function animateCounters() {
    const stats = document.querySelectorAll('.stat-number');

    const observerOptions = {
        threshold: 0.5
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const finalValue = element.textContent;
                const numericValue = parseInt(finalValue);

                if (!isNaN(numericValue)) {
                    animateValue(element, 0, numericValue, 2000);
                }
                observer.unobserve(element);
            }
        });
    }, observerOptions);

    stats.forEach(stat => observer.observe(stat));
}

function animateValue(element, start, end, duration) {
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    const originalText = element.textContent;
    const suffix = originalText.replace(/\d/g, '');

    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end + suffix;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current) + suffix;
        }
    }, 16);
}

// Initialize counter animation
window.addEventListener('load', animateCounters);

// ============================================
// RESPONSIVE MENU BEHAVIOR - HANDLED IN CSS
// ============================================
// Menu state is now controlled entirely through CSS and classes
// No inline styles needed!

// ============================================
// SCROLL TO TOP BUTTON
// ============================================

function createScrollToTopButton() {
    const button = document.createElement('button');
    button.textContent = '↑';
    button.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: rgba(0, 212, 194, 0.9);
        color: #0F1419;
        border: none;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        z-index: 999;
        box-shadow: 0 4px 16px rgba(0, 212, 194, 0.35);
        transition: all 0.3s ease;
    `;

    button.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            button.style.display = 'flex';
        } else {
            button.style.display = 'none';
        }
    });

    document.body.appendChild(button);
}

createScrollToTopButton();

// ============================================
// MOUSE TRACKING EFFECT FOR HERO
// ============================================

function initializeMouseTracking() {
    const heroBg = document.querySelector('.hero-bg');
    if (!heroBg) return;

    document.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth) * 100;
        const y = (e.clientY / window.innerHeight) * 100;

        heroBg.style.transform = `translate(${x * 0.01}px, ${y * 0.01}px)`;
    });
}

initializeMouseTracking();

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

document.addEventListener('keydown', (e) => {
    // Press '/' to focus search or navigation
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.querySelector('.nav-menu a')?.focus();
    }

    // Press 'Escape' to close mobile menu
    if (e.key === 'Escape') {
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu && navMenu.style.display === 'flex') {
            navMenu.style.display = 'none';
        }
    }
});

// ============================================
// PERFORMANCE - LAZY LOADING
// ============================================

if ('IntersectionObserver' in window) {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));
}

// ============================================
// FORM HANDLING (if needed in future)
// ============================================

function handleFormSubmit(formId, callback) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Add form handling logic here
        showNotification('Thank you! We\'ll be in touch soon.', 'success');
        if (callback) callback();
    });
}

// ============================================
// PAGE LOAD ANIMATIONS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Fade in body
    document.body.style.animation = 'fadeInUp 0.5s ease-out';

    // Stagger animations for nav items
    const navItems = document.querySelectorAll('.nav-link, .nav-actions button');
    navItems.forEach((item, index) => {
        item.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1 + 0.1}s backwards`;
    });
});

// ============================================
// CONSOLE MESSAGE
// ============================================

console.log('%cChatter ◆', 'font-size: 20px; color: #00D4C2; font-weight: bold;');
console.log('%cReal-time messaging, encrypted & simple.', 'font-size: 14px; color: rgba(200,210,234,0.9);');
console.log('%cWeb app: https://chatter-mobo-app.onrender.com', 'font-size: 12px; color: #6b7280;');
