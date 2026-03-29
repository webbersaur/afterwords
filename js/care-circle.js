/* ========================================
   AfterWords — Care Circle JS
   ======================================== */

// --- Mobile nav toggle ---
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('nav');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// --- Reaction buttons ---
document.querySelectorAll('.reaction').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Parse current count
    const text = btn.textContent.trim();
    const emoji = text.slice(0, 2);
    let count = parseInt(text.slice(2)) || 0;

    if (btn.classList.contains('active')) {
      count--;
      btn.classList.remove('active');
    } else {
      count++;
      btn.classList.add('active');
    }

    btn.textContent = `${emoji} ${count}`;
  });
});

// --- Message form ---
const messageForm = document.getElementById('message-form');
const messagesList = document.querySelector('.messages-list');

if (messageForm) {
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = messageForm.querySelector('.message-name').value.trim();
    const text = messageForm.querySelector('.message-text').value.trim();

    if (!name || !text) return;

    // Create message card
    const card = document.createElement('div');
    card.className = 'message-card';
    card.style.opacity = '0';
    card.style.transform = 'translateY(12px)';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

    card.innerHTML = `
      <div class="message-author">${escapeHtml(name)}</div>
      <div class="message-date">${dateStr}</div>
      <p>${escapeHtml(text)}</p>
    `;

    // Insert at top of messages list
    messagesList.insertBefore(card, messagesList.firstChild);

    // Animate in
    requestAnimationFrame(() => {
      card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    });

    // Reset form
    messageForm.reset();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
