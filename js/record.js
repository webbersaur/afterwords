/* ========================================
   AfterWords — Record / Visit Recap JS
   ======================================== */

// --- Tab switching ---
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tabContents.forEach((tc) => tc.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// --- Recorder simulation (MVP demo) ---
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const recorderRing = document.getElementById('recorder-ring');
const recorderStatus = document.getElementById('recorder-status');
const recorderTimer = document.getElementById('recorder-timer');
const waveform = document.getElementById('waveform');

let recording = false;
let timerInterval = null;
let seconds = 0;

btnRecord.addEventListener('click', () => {
  if (!recording) {
    startRecording();
  }
});

btnStop.addEventListener('click', () => {
  stopRecording();
  showProcessing();
});

function startRecording() {
  recording = true;
  recorderRing.classList.add('recording');
  waveform.classList.add('active');
  btnRecord.style.display = 'none';
  btnStop.style.display = 'inline-flex';
  recorderStatus.textContent = 'Recording...';

  seconds = 0;
  timerInterval = setInterval(() => {
    seconds++;
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    recorderTimer.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopRecording() {
  recording = false;
  recorderRing.classList.remove('recording');
  waveform.classList.remove('active');
  clearInterval(timerInterval);
  recorderStatus.textContent = 'Recording stopped';
}

// --- Upload zone ---
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const fileRemove = document.getElementById('file-remove');
const btnUploadProcess = document.getElementById('btn-upload-process');

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files.length) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) {
    handleFile(fileInput.files[0]);
  }
});

function handleFile(file) {
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  uploadZone.style.display = 'none';
  uploadPreview.style.display = 'block';
}

fileRemove.addEventListener('click', () => {
  fileInput.value = '';
  uploadZone.style.display = 'block';
  uploadPreview.style.display = 'none';
});

btnUploadProcess.addEventListener('click', () => {
  showProcessing();
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// --- Processing simulation ---
function showProcessing() {
  document.getElementById('step-record').style.display = 'none';
  document.getElementById('step-process').style.display = 'block';

  const steps = [
    { id: 'p-step-1', delay: 0, duration: 2500 },
    { id: 'p-step-2', delay: 2500, duration: 2000 },
    { id: 'p-step-3', delay: 4500, duration: 2000 }
  ];

  steps.forEach((step, i) => {
    // Mark step as active
    setTimeout(() => {
      const el = document.getElementById(step.id);
      el.classList.add('active');
      el.querySelector('.p-step-icon').classList.add('spinning');

      // Update title text
      const titles = [
        'Transcribing your recording...',
        'Analyzing medical content...',
        'Generating your summary...'
      ];
      document.getElementById('processing-title').textContent = titles[i];
    }, step.delay);

    // Mark step as done
    setTimeout(() => {
      const el = document.getElementById(step.id);
      el.classList.remove('active');
      el.classList.add('done');
      el.querySelector('.p-step-icon').classList.remove('spinning');
      el.querySelector('.p-step-icon').textContent = '\u2713';
    }, step.delay + step.duration);
  });

  // Show recap after all steps
  setTimeout(() => {
    document.getElementById('step-process').style.display = 'none';
    document.getElementById('step-recap').style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 7000);
}

// --- Transcript toggle ---
const transcriptToggle = document.getElementById('transcript-toggle');
const transcriptBody = document.getElementById('transcript-body');

transcriptToggle.addEventListener('click', () => {
  transcriptToggle.classList.toggle('open');
  transcriptBody.style.display = transcriptBody.style.display === 'none' ? 'block' : 'none';
});

// --- Share to Care Circle modal ---
const shareModal = document.getElementById('share-modal');
const btnShare = document.getElementById('btn-share');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalShare = document.getElementById('modal-share');
const shareNote = document.getElementById('share-note');
const previewNote = document.getElementById('preview-note');
const previewSectionsCount = document.getElementById('preview-sections-count');
const sectionCheckboxes = document.querySelectorAll('.share-option input[type="checkbox"]');

// Open modal
btnShare.addEventListener('click', () => {
  shareModal.style.display = 'flex';
  shareNote.focus();
});

// Close modal
function closeModal() {
  shareModal.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);

shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal) closeModal();
});

// Live preview of personal note
shareNote.addEventListener('input', () => {
  const text = shareNote.value.trim();
  if (text) {
    previewNote.innerHTML = `<p>${escapeHtml(text)}</p>`;
  } else {
    previewNote.innerHTML = '<p><em>Your personal note will appear here...</em></p>';
  }
});

// Update section count
function updateSectionCount() {
  const checked = document.querySelectorAll('.share-option input:checked').length;
  if (checked === 0) {
    previewSectionsCount.textContent = 'No recap sections attached';
  } else if (checked === 1) {
    previewSectionsCount.textContent = '1 recap section attached';
  } else {
    previewSectionsCount.textContent = `${checked} recap sections attached`;
  }
}

sectionCheckboxes.forEach((cb) => {
  cb.addEventListener('change', updateSectionCount);
});

// --- Photo upload ---
const photoUploadZone = document.getElementById('photo-upload-zone');
const photoInput = document.getElementById('photo-input');
const photoPreviewWrapper = document.getElementById('photo-preview-wrapper');
const photoPreviewImg = document.getElementById('photo-preview-img');
const photoRemove = document.getElementById('photo-remove');
const previewPhoto = document.getElementById('preview-photo');
const previewPhotoImg = document.getElementById('preview-photo-img');

photoUploadZone.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', () => {
  if (photoInput.files.length) {
    const file = photoInput.files[0];
    const url = URL.createObjectURL(file);

    // Show photo preview in upload area
    photoPreviewImg.src = url;
    photoUploadZone.style.display = 'none';
    photoPreviewWrapper.style.display = 'block';

    // Show in live preview card
    previewPhotoImg.src = url;
    previewPhoto.style.display = 'block';
  }
});

photoRemove.addEventListener('click', () => {
  photoInput.value = '';
  photoUploadZone.style.display = 'block';
  photoPreviewWrapper.style.display = 'none';
  previewPhoto.style.display = 'none';
  previewPhotoImg.src = '';
});

// Post to Care Circle
modalShare.addEventListener('click', () => {
  const note = shareNote.value.trim();
  const sections = [...document.querySelectorAll('.share-option input:checked')].map(cb => cb.value);

  // Show success state
  const modalBody = document.querySelector('.modal-body');
  const modalFooter = document.querySelector('.modal-footer');

  modalBody.innerHTML = `
    <div class="share-success">
      <div class="share-success-icon">&#x2705;</div>
      <h3>Posted to Your Care Circle!</h3>
      <p>Your update is live. Friends and family can see it now.</p>
    </div>
  `;
  modalFooter.innerHTML = `
    <a href="care-circle.html" class="btn btn-primary">View Care Circle</a>
    <button class="btn btn-outline" onclick="document.getElementById('share-modal').style.display='none'">Close</button>
  `;
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Mobile nav toggle ---
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('nav');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}
