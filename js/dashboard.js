/* ========================================
   AfterWords — Dashboard JS
   ======================================== */

// --- Mobile nav toggle ---
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('nav');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

// --- Copy share link ---
const btnCopyLink = document.getElementById('btn-copy-link');

if (btnCopyLink) {
  btnCopyLink.addEventListener('click', () => {
    const link = window.location.origin + '/app/care-circle.html';

    navigator.clipboard.writeText(link).then(() => {
      showToast('Share link copied!');
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      showToast('Share link copied!');
    });
  });
}

function showToast(message) {
  // Remove existing toast if any
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// --- Action item checkboxes (update progress) ---
const actionCheckboxes = document.querySelectorAll('.dash-action-item input[type="checkbox"]');
const progressFill = document.querySelector('.progress-fill');
const progressHeader = document.querySelector('.dash-progress-header span:first-child');
const progressPct = document.querySelector('.dash-progress-pct');

function updateProgress() {
  const total = actionCheckboxes.length;
  const checked = document.querySelectorAll('.dash-action-item input:checked').length;
  const pct = Math.round((checked / total) * 100);

  progressFill.style.width = `${pct}%`;
  progressHeader.textContent = `${checked} of ${total} completed`;
  progressPct.textContent = `${pct}%`;

  // Update stat card
  const statNumber = document.querySelectorAll('.stat-number')[3];
  if (statNumber) {
    statNumber.textContent = `${checked}/${total}`;
  }
}

actionCheckboxes.forEach((cb) => {
  cb.addEventListener('change', updateProgress);
});
