# 🌐 NGROK SETUP FOR DEEL OAUTH TESTING

## Step 1: Start ngrok tunnel
```bash
# Open a new terminal and run:
ngrok http 8081
```

## Step 2: Copy the public URL
Look for a line like:
```
Forwarding  https://abc123-def456.ngrok.io -> http://localhost:8081
```

## Step 3: Update Deel OAuth App
1. Go to Deel Developer Portal
2. Add the ngrok URL as redirect URI:
   `https://YOUR-NGROK-URL.ngrok.io/auth/deel/callback`

## Step 4: Update our code (if needed)
The code should auto-detect ngrok URLs, but verify in console.

## Step 5: Test
1. Access your app via the ngrok URL: https://YOUR-NGROK-URL.ngrok.io
2. Test the OAuth flow
3. Should now work without redirect URI errors!

## Alternative: Use 127.0.0.1 instead of localhost
Some OAuth providers accept 127.0.0.1 but not localhost:
`http://127.0.0.1:8081/auth/deel/callback`
