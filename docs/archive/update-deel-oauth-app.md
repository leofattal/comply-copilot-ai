# Update Deel OAuth App Configuration

## URGENT: Add Localhost Redirect URI

You need to update your Deel Developer App settings to include the localhost redirect URI:

### Steps:
1. Go to Deel Developer Portal: https://app.deel.com/developer
2. Find your app with Client ID: ced9ba0f-d3b3-475b-80f2-57f1f0b9d161
3. Edit the "Redirect URIs" section
4. Add BOTH URLs:
   - http://localhost:8081/auth/deel/callback  ← ADD THIS
   - https://comply-copilot-ai.lovable.app/auth/deel/callback  ← EXISTING

### Expected Result:
- ✅ Localhost testing will work
- ✅ Production deployment will work 
- ✅ No more "Invalid redirect URI" 400 errors

## Note:
Make sure to use http:// (not https://) for localhost URLs.
