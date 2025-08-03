// Test script to check what URL the Edge Function is actually generating
// Run this in browser console or as a Node.js script

const testOAuthFunction = async () => {
  try {
    // Get the current session token (you'll need to replace this)
    const token = 'your-session-token-here';
    
    const response = await fetch('https://eufsshczsdzfxmlkbpey.supabase.co/functions/v1/deel-oauth?action=authorize', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Edge Function Response:', result);
    
    if (result.authUrl) {
      console.log('Generated Auth URL:', result.authUrl);
      
      // Parse and check the URL
      const url = new URL(result.authUrl);
      console.log('Domain:', url.hostname);
      console.log('Path:', url.pathname);
      console.log('Query params:', Object.fromEntries(url.searchParams));
      
      // Check if it's the correct format
      if (url.hostname === 'app.deel.com' && url.pathname === '/oauth2/authorize') {
        console.log('✅ URL format is CORRECT');
      } else {
        console.log('❌ URL format is WRONG');
        console.log('Expected: app.deel.com/oauth2/authorize');
        console.log('Got:', url.hostname + url.pathname);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// testOAuthFunction();
console.log('Test function created. Call testOAuthFunction() to run.');
