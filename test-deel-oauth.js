// Quick test script to verify the OAuth URL generation
// You can run this in browser console after implementing the fix

async function testDeelOAuthURL() {
  try {
    // Test what the corrected Edge Function should return
    const correctURL = new URL('https://app.deel.com/oauth2/authorize');
    correctURL.searchParams.set('client_id', 'ced9ba0f-d3b3-475b-80f2-57f1f0b9d161');
    correctURL.searchParams.set('redirect_uri', 'https://comply-copilot-ai.lovable.app/auth/deel/callback');
    correctURL.searchParams.set('response_type', 'code');
    correctURL.searchParams.set('state', 'test-state-123');
    correctURL.searchParams.set('scope', 'employees:read contracts:read payroll:read org:read timesheets:read webhooks:write');
    
    console.log('✅ CORRECT OAuth URL:', correctURL.toString());
    console.log('❌ BROKEN URL from error:', 'api.deel.com/apps/oauth2/authorize/start?clientId=...');
    
    // Test if URL is valid
    const testResponse = await fetch(correctURL.toString(), { method: 'HEAD' });
    console.log('URL accessibility test:', testResponse.status === 200 ? '✅ Accessible' : '❌ Not accessible');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testDeelOAuthURL();
