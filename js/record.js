/* ========================================
   AfterWords — Record / Visit Recap JS
   ======================================== */

// --- Auth check ---
(async () => {
  const session = await requireAuth();
  if (!session) return;
})();

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

// --- Real audio recording via MediaRecorder ---
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const recorderRing = document.getElementById('recorder-ring');
const recorderStatus = document.getElementById('recorder-status');
const recorderTimer = document.getElementById('recorder-timer');
const waveform = document.getElementById('waveform');

let recording = false;
let timerInterval = null;
let seconds = 0;
let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;

btnRecord.addEventListener('click', async () => {
  if (!recording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      startRecording(stream);
    } catch (err) {
      recorderStatus.textContent = 'Microphone access denied. Please allow microphone access and try again.';
    }
  }
});

btnStop.addEventListener('click', () => {
  stopRecording();
});

function startRecording(stream) {
  recording = true;
  audioChunks = [];
  recorderRing.classList.add('recording');
  waveform.classList.add('active');
  btnRecord.style.display = 'none';
  btnStop.style.display = 'inline-flex';
  recorderStatus.textContent = 'Recording...';

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
    stream.getTracks().forEach((track) => track.stop());
    processAudio(recordedBlob);
  };

  mediaRecorder.start(1000); // collect in 1s chunks

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
  recorderStatus.textContent = 'Processing...';

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

// --- Upload zone ---
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const fileRemove = document.getElementById('file-remove');
const btnUploadProcess = document.getElementById('btn-upload-process');

let uploadedFile = null;

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
  uploadedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);
  uploadZone.style.display = 'none';
  uploadPreview.style.display = 'block';
}

fileRemove.addEventListener('click', () => {
  fileInput.value = '';
  uploadedFile = null;
  uploadZone.style.display = 'block';
  uploadPreview.style.display = 'none';
});

btnUploadProcess.addEventListener('click', () => {
  if (uploadedFile) {
    processAudio(uploadedFile);
  }
});

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// --- Main processing pipeline ---
async function processAudio(audioBlob) {
  // Show processing UI
  document.getElementById('step-record').style.display = 'none';
  document.getElementById('step-process').style.display = 'block';

  const pStep1 = document.getElementById('p-step-1');
  const pStep2 = document.getElementById('p-step-2');
  const pStep3 = document.getElementById('p-step-3');
  const processingTitle = document.getElementById('processing-title');

  try {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated');

    // Step 1: Upload audio to Supabase Storage
    markStepActive(pStep1);
    processingTitle.textContent = 'Uploading your recording...';

    const audioPath = `${user.id}/${Date.now()}.webm`;
    const { error: uploadError } = await _supabase.storage
      .from('recordings')
      .upload(audioPath, audioBlob, { contentType: 'audio/webm' });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Create recap record in database
    const { data: recap, error: recapError } = await _supabase
      .from('recaps')
      .insert({ user_id: user.id, audio_path: audioPath, status: 'pending' })
      .select()
      .single();

    if (recapError) throw new Error(`Failed to create recap: ${recapError.message}`);

    // Step 2: Transcribe
    markStepDone(pStep1);
    markStepActive(pStep2);
    processingTitle.textContent = 'Transcribing your recording...';

    const transcribeRes = await _supabase.functions.invoke('transcribe', {
      body: { recap_id: recap.id, audio_path: audioPath },
    });

    if (transcribeRes.error) throw new Error(`Transcription failed: ${transcribeRes.error.message}`);

    // Step 3: Summarize
    markStepDone(pStep2);
    markStepActive(pStep3);
    processingTitle.textContent = 'Generating your summary...';

    const summarizeRes = await _supabase.functions.invoke('summarize', {
      body: { recap_id: recap.id },
    });

    if (summarizeRes.error) throw new Error(`Summary failed: ${summarizeRes.error.message}`);

    markStepDone(pStep3);

    // Show recap
    const summary = summarizeRes.data.summary;
    const transcript = transcribeRes.data.transcript;
    renderRecap(summary, transcript, recap.id);

  } catch (error) {
    processingTitle.textContent = 'Something went wrong';
    document.getElementById('processing-sub').textContent = error.message;
    document.querySelector('.processing-spinner').style.display = 'none';
  }
}

function markStepActive(el) {
  el.classList.add('active');
  el.querySelector('.p-step-icon').classList.add('spinning');
}

function markStepDone(el) {
  el.classList.remove('active');
  el.classList.add('done');
  const icon = el.querySelector('.p-step-icon');
  icon.classList.remove('spinning');
  icon.textContent = '\u2713';
}

// --- Render real AI recap ---
let currentRecapId = null;

function renderRecap(summary, transcript, recapId) {
  currentRecapId = recapId;

  document.getElementById('step-process').style.display = 'none';
  document.getElementById('step-recap').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Title
  document.querySelector('.recap-date').textContent = summary.title || 'Visit Recap';

  // Build recap grid
  const grid = document.querySelector('.recap-grid');
  grid.innerHTML = '';

  // Diagnosis card
  if (summary.diagnosis) {
    grid.innerHTML += recapCard('&#x1f4cb;', '', 'Diagnosis', `
      <p>${escapeHtml(summary.diagnosis.summary)}</p>
      ${summary.diagnosis.details ? summary.diagnosis.details.map(d =>
        `<p>${escapeHtml(d)}</p>`
      ).join('') : ''}
    `);
  }

  // Treatment Plan card
  if (summary.treatment_plan && summary.treatment_plan.length) {
    grid.innerHTML += recapCard('&#x1f489;', 'accent', 'Treatment Plan', `
      <ul>
        ${summary.treatment_plan.map(t => `
          <li><strong>${escapeHtml(t.type)}:</strong> ${escapeHtml(t.description)}${t.details ? ' — ' + escapeHtml(t.details) : ''}</li>
        `).join('')}
      </ul>
    `);
  }

  // Key Findings card
  if (summary.key_findings && summary.key_findings.length) {
    grid.innerHTML += recapCard('&#x1f50d;', '', 'Key Findings', `
      ${summary.key_findings.map(f => `
        <div class="med-item">
          <strong>${escapeHtml(f.finding)}</strong>
          <span class="med-detail">${escapeHtml(f.detail)}</span>
          <span class="med-purpose">${escapeHtml(f.significance)}</span>
        </div>
      `).join('')}
    `);
  }

  // Action Items card
  if (summary.action_items && summary.action_items.length) {
    grid.innerHTML += recapCard('&#x2705;', 'accent', 'Action Items', `
      <div class="action-list">
        ${summary.action_items.map(a => `
          <label class="action-item">
            <input type="checkbox">
            <span>${escapeHtml(a)}</span>
          </label>
        `).join('')}
      </div>
    `);
  }

  // Follow-up Questions card
  if (summary.follow_up_questions && summary.follow_up_questions.length) {
    grid.innerHTML += `
      <div class="recap-card full-width">
        <div class="recap-card-header">
          <div class="recap-card-icon">&#x2753;</div>
          <h3>Questions for Next Visit</h3>
        </div>
        <div class="recap-card-body">
          <p class="questions-intro">Based on your conversation, here are questions you may want to ask at your next appointment:</p>
          <ol class="questions-list">
            ${summary.follow_up_questions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
          </ol>
        </div>
      </div>
    `;
  }

  // Transcript
  if (transcript) {
    document.querySelector('.transcript-content').innerHTML =
      `<p>${escapeHtml(transcript)}</p>`;
  }
}

function recapCard(icon, variant, title, bodyHtml) {
  return `
    <div class="recap-card">
      <div class="recap-card-header">
        <div class="recap-card-icon ${variant}">${icon}</div>
        <h3>${escapeHtml(title)}</h3>
      </div>
      <div class="recap-card-body">${bodyHtml}</div>
    </div>
  `;
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

btnShare.addEventListener('click', () => {
  shareModal.style.display = 'flex';
  shareNote.focus();
});

function closeModal() {
  shareModal.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);

shareModal.addEventListener('click', (e) => {
  if (e.target === shareModal) closeModal();
});

shareNote.addEventListener('input', () => {
  const text = shareNote.value.trim();
  if (text) {
    previewNote.innerHTML = `<p>${escapeHtml(text)}</p>`;
  } else {
    previewNote.innerHTML = '<p><em>Your personal note will appear here...</em></p>';
  }
});

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
    photoPreviewImg.src = url;
    photoUploadZone.style.display = 'none';
    photoPreviewWrapper.style.display = 'block';
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

// Post to Care Circle (now saves to Supabase)
modalShare.addEventListener('click', async () => {
  const note = shareNote.value.trim();
  const sections = [...document.querySelectorAll('.share-option input:checked')].map(cb => cb.value);

  modalShare.disabled = true;
  modalShare.textContent = 'Posting...';

  try {
    const user = await getUser();
    let photoPath = null;

    // Upload photo if present
    if (photoInput.files.length) {
      const photo = photoInput.files[0];
      photoPath = `${user.id}/${Date.now()}-${photo.name}`;
      await _supabase.storage.from('photos').upload(photoPath, photo);
    }

    // Insert care circle post
    const { error } = await _supabase.from('care_circle_posts').insert({
      user_id: user.id,
      recap_id: currentRecapId,
      note,
      photo_path: photoPath,
      shared_sections: sections,
    });

    if (error) throw error;

    // Success UI
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
  } catch (err) {
    modalShare.disabled = false;
    modalShare.textContent = 'Post to Care Circle';
    const shareError = document.getElementById('share-error');
    shareError.textContent = 'Failed to post: ' + err.message;
    shareError.style.display = 'block';
  }
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
