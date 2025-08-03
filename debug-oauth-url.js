// Debug script - paste in browser console at ngrok URL
console.log('🔍 Debugging OAuth URL generation...');

// Check environment detection
console.log('Current hostname:', window.location.hostname);
console.log('Current origin:', window.location.origin);

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

console.log('✅ Generated redirect URI:', redirectUri);

// Check localStorage
const credentials = localStorage.getItem('deel_credentials');
console.log('LocalStorage credentials:', credentials ? 'Found' : 'Not found');

if (credentials) {
  const parsed = JSON.parse(credentials);
  console.log('Authorize URI from storage:', parsed.authorizeUri);
  
  // Test OAuth URL generation
  const authUrl = new URL(parsed.authorizeUri || 'https://app.deel.com/oauth2/authorize');
  authUrl.searchParams.set('client_id', parsed.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('state', 'test-state-123');
  authUrl.searchParams.set('scope', 'employees:read contracts:read payroll:read org:read timesheets:read webhooks:write');
  
  console.log('✅ CORRECT OAuth URL should be:', authUrl.toString());
  console.log('❌ WRONG URL from error:', 'api.deel.com/apps/oauth2/authorize/start');
}
