/* ========================================
   AfterWords — Supabase Client
   ======================================== */

const SUPABASE_URL = 'https://ozwnzzfntdaeabjvggzz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96d256emZudGRhZWFianZnZ3p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDc0NDksImV4cCI6MjA5MDM4MzQ0OX0._qH7LtOUQ1nVSFOiI-HTAiW_VpSZVYsuqtG0lG6BK18';

// Initialize client (loaded via CDN in HTML)
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Base URL for redirects — works on GitHub Pages (/afterwords/) and localhost
const BASE_URL = location.pathname.includes('/afterwords/')
  ? location.origin + '/afterwords'
  : location.origin;

// --- Auth helpers ---

async function getUser() {
  const { data: { user } } = await _supabase.auth.getUser();
  return user;
}

async function getSession() {
  const { data: { session } } = await _supabase.auth.getSession();
  return session;
}

async function signInWithMagicLink(email) {
  const { error } = await _supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: BASE_URL + '/app/dashboard.html',
    },
  });
  return { error };
}

async function signOut() {
  const { error } = await _supabase.auth.signOut();
  if (!error) window.location.href = BASE_URL + '/index.html';
  return { error };
}

// Redirect to login if not authenticated (use on protected pages)
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = BASE_URL + '/app/login.html';
    return null;
  }
  document.body.style.visibility = 'visible';
  return session;
}

// Listen for auth state changes
_supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = BASE_URL + '/index.html';
  }
});
