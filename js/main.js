/* ========================================
   AfterWords — Main JS
   ======================================== */

// --- Mobile nav toggle ---
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('nav');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// --- Scroll reveal (IntersectionObserver) ---
const revealElements = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach((el) => observer.observe(el));

// --- Waitlist form (placeholder — stores to localStorage for now) ---
const form = document.getElementById('waitlist-form');
const formMessage = document.getElementById('form-message');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value.trim();

    if (!email) return;

    // Store locally for MVP — replace with real backend later
    const waitlist = JSON.parse(localStorage.getItem('afterwords-waitlist') || '[]');
    if (waitlist.includes(email)) {
      showMessage("You're already on the list!", 'var(--color-accent)');
      return;
    }

    waitlist.push(email);
    localStorage.setItem('afterwords-waitlist', JSON.stringify(waitlist));

    form.querySelector('input[type="email"]').value = '';
    showMessage("You're in! We'll be in touch soon.", 'var(--color-primary)');
  });
}

function showMessage(text, color) {
  formMessage.textContent = text;
  formMessage.style.color = color;
  formMessage.style.display = 'block';
  setTimeout(() => {
    formMessage.style.display = 'none';
  }, 4000);
}
