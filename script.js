// Mobile Navigation Toggle
const navToggle = document.getElementById('navToggle');
const navMenu = document.querySelector('.nav-menu');

navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    });
});

// Header scroll effect
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = 'var(--shadow-sm)';
    }

    lastScroll = currentScroll;
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Form submission
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    // Get form data
    const formData = {
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        petName: document.getElementById('petName').value,
        service: document.getElementById('service').value,
        message: document.getElementById('message').value
    };

    // Here you would normally send this to a server
    console.log('Form submitted:', formData);

    // Show success message
    showNotification('¡Gracias! Tu reserva ha sido enviada. Te contactaremos pronto.');

    // Reset form
    contactForm.reset();
});

// Notification function
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <span class="notification-icon">✅</span>
        <span class="notification-text">${message}</span>
    `;

    // Add styles
    notification.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        background: linear-gradient(135deg, #7c3aed 0%, #f472b6 100%);
        color: white;
        padding: 20px 30px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 40px rgba(124, 58, 237, 0.4);
        z-index: 9999;
        animation: slideIn 0.5s ease;
        max-width: 400px;
    `;

    // Add animation keyframes
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(styleSheet);

    // Add to DOM
    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease forwards';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 5000);
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.service-card, .testimonial-card, .feature, .gallery-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// Add animate-in class styles
const animateStyle = document.createElement('style');
animateStyle.textContent = `
    .animate-in {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
`;
document.head.appendChild(animateStyle);

// Counter animation for stats
function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);

    function updateCounter() {
        start += increment;
        if (start < target) {
            element.textContent = Math.floor(start) + (target === 4.9 ? '' : '+');
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target + (target === 4.9 ? '' : '+');
        }
    }

    updateCounter();
}

// Trigger counter animation when hero is visible
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            document.querySelectorAll('.stat-number').forEach(stat => {
                const text = stat.textContent;
                const number = parseFloat(text);
                if (!isNaN(number)) {
                    animateCounter(stat, number);
                }
            });
            heroObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroSection = document.querySelector('.hero');
if (heroSection) {
    heroObserver.observe(heroSection);
}

// Parallax effect for floating cards
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const cards = document.querySelectorAll('.floating-card');

    cards.forEach((card, index) => {
        const speed = 0.05 * (index + 1);
        card.style.transform = `translateY(${scrolled * speed}px)`;
    });
});

// --- CULQI INTEGRATION & CART LOGIC ---

// Configuration for Culqi (Test Key)
const CULQI_PUBLIC_KEY = 'pk_test_bxGG2MOE6tdVoo65'; // User's Test Key

let currentCart = {
    service: "",
    price: 0,
    amount: 0
};

// UI Elements
const cartOverlay = document.getElementById('cartOverlay');
const closeCart = document.getElementById('closeCart');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotalText = document.getElementById('cartTotalText');
const btnCheckout = document.getElementById('btnCheckout');

// Function to open cart
function openCart(service, price) {
    // Re-select elements to ensure they exist
    const overlay = document.getElementById('cartOverlay');
    const itemsList = document.getElementById('cartItemsList');
    const totalText = document.getElementById('cartTotalText');

    // Update global state
    currentCart.service = service;
    currentCart.price = price; // price in cents for Culqi
    currentCart.amount = price / 100;

    if (itemsList && totalText) {
        itemsList.innerHTML = `
            <div class="cart-item">
                <span>${service}</span>
                <span>S/ ${currentCart.amount.toFixed(2)}</span>
            </div>
        `;
        totalText.textContent = `S/ ${currentCart.amount.toFixed(2)}`;
    }

    if (overlay) {
        overlay.style.display = 'flex'; // Ensure flexbox is used
        overlay.style.visibility = 'visible';
        overlay.style.opacity = '1';
        overlay.style.zIndex = '999999'; // Ensure it's on top
        overlay.classList.add('active');
    } else {
        console.error('CRITICAL: Cart overlay element not found');
        alert('Error: No se pudo abrir el carrito. Por favor recarga la página.');
    }
}

// Event Listeners for "Pagar" buttons
function attachPayListeners() {
    const payButtons = document.querySelectorAll('.btn-pay');
    console.log(`Attached listeners to ${payButtons.length} payment buttons`);
    payButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const service = e.target.getAttribute('data-service');
            const price = parseInt(e.target.getAttribute('data-price'));
            openCart(service, price);
        });
    });
}

// Ensure elements exist before attaching listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachPayListeners);
} else {
    attachPayListeners();
}

// Close modal
closeCart?.addEventListener('click', () => {
    cartOverlay.classList.remove('active');
    // Reset styles
    cartOverlay.style.visibility = '';
    cartOverlay.style.opacity = '';
});

cartOverlay?.addEventListener('click', (e) => {
    if (e.target === cartOverlay) {
        cartOverlay.classList.remove('active');
        cartOverlay.style.visibility = '';
        cartOverlay.style.opacity = '';
    }
});

// Initialize Culqi
function initCulqi() {
    if (window.Culqi) {
        console.log('Culqi SDK loaded');
        Culqi.publicKey = CULQI_PUBLIC_KEY;
        Culqi.settings({
            title: 'La Vecindad del Perro',
            currency: 'PEN',
            description: 'Servicios de Spa para Mascotas',
            amount: 0 // Will be updated on checkout
        });

        Culqi.options({
            lang: 'auto',
            modal: true,
            installments: false,
            customButton: 'Pagar ahora'
        });
    } else {
        console.error('Culqi SDK not loaded yet. Retrying...');
        setTimeout(initCulqi, 500);
    }
}

// Start watching for Culqi
initCulqi();

// Checkout Button logic
btnCheckout?.addEventListener('click', () => {
    if (!window.Culqi) {
        showNotification('Error: La pasarela de pagos no está lista. Recarga la página.');
        return;
    }

    // Update settings with current amount
    Culqi.settings({
        title: 'La Vecindad del Perro',
        currency: 'PEN',
        description: currentCart.service || 'Servicio de Spa',
        amount: currentCart.price
    });

    Culqi.open();
});

// Handle Culqi Token (Response)
// Handle Culqi Token (Response)
function culqi() {
    if (Culqi.token) {
        const token = Culqi.token.id;
        // console.log('Token Culqi recibido:', token); 

        // 1. Force close the cart modal
        if (cartOverlay) {
            cartOverlay.classList.remove('active');
            cartOverlay.style.display = 'none'; // Force hide immediately
            cartOverlay.style.visibility = '';
            cartOverlay.style.opacity = '';
            cartOverlay.style.zIndex = '';
        }

        // 2. Show success message
        showNotification('¡Pago exitoso! 🐶 Gracias por tu compra.');

        // 3. Reset cart (optional cleanliness)
        currentCart = { service: "", price: 0, amount: 0 };

        // In a real app, send the token to your backend here
    } else {
        // Error handling
        if (Culqi.error) {
            console.log(Culqi.error);
            showNotification('Error: ' + Culqi.error.user_message);
        }
    }
}

// Ensure Culqi response function is global
window.culqi = culqi;
