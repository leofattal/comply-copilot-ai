// Quick test script - run in browser console after ngrok setup
console.log('🧪 Testing ngrok setup...');

// Check current hostname
console.log('Current hostname:', window.location.hostname);
console.log('Current origin:', window.location.origin);

// Test environment detection
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isNgrok = window.location.hostname.includes('.ngrok.io') || window.location.hostname.includes('.ngrok-free.app');

console.log('Is localhost:', isLocalhost);
console.log('Is ngrok:', isNgrok);

// Test redirect URI generation
let redirectUri;
if (isLocalhost) {
  redirectUri = `${window.location.origin}/auth/deel/callback`;
} else if (isNgrok) {
  redirectUri = `${window.location.origin}/auth/deel/callback`;
} else {
  redirectUri = 'https://comply-copilot-ai.lovable.app/auth/deel/callback';
}

console.log('Generated redirect URI:', redirectUri);

if (isNgrok) {
  console.log('✅ ngrok detected! Use this redirect URI in Deel app:');
  console.log('   ', redirectUri);
} else {
  console.log('❌ Not running on ngrok. Make sure you access via the ngrok URL.');
}
