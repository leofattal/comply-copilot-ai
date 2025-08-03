# 🌐 NGROK OAUTH TESTING GUIDE

## Step 1: Set up ngrok auth (if not done)
1. Get auth token from: https://dashboard.ngrok.com/get-started/your-authtoken
2. Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

## Step 2: Start ngrok tunnel
```bash
ngrok http 8081
```

## Step 3: Copy your ngrok URL
Look for the line:
```
Forwarding  https://XXXXXXX.ngrok.io -> http://localhost:8081
```
Copy the https://XXXXXXX.ngrok.io URL

## Step 4: Update Deel OAuth App
1. Go to: https://app.deel.com/developer
2. Find app with Client ID: ced9ba0f-d3b3-475b-80f2-57f1f0b9d161
3. Edit "Redirect URIs"
4. Add: https://YOUR-NGROK-URL.ngrok.io/auth/deel/callback

Example:
- https://abc123-def456.ngrok.io/auth/deel/callback

## Step 5: Test OAuth Flow
1. Access your app via ngrok URL: https://YOUR-NGROK-URL.ngrok.io
2. Click "Initialize Credentials"
3. Click "Authorize with Deel"
4. Should redirect to Deel successfully!

## Expected Results:
✅ No "Invalid redirect URI" errors
✅ Successful OAuth authorization
✅ Access to Deel sandbox data

## Troubleshooting:
- Make sure ngrok URL matches exactly in Deel app
- Make sure to use the https:// version
- Check browser console for any errors
