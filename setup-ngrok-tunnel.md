# 🚀 Ngrok Setup Instructions

## Step 1: Create Secure Tunnel
Open a NEW terminal window and run:
```bash
ngrok http 8081
```

## Step 2: Get Your Public URL
After running ngrok, you'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:8081
```

## Step 3: Use the HTTPS URL in Deel
Copy the HTTPS ngrok URL and add to Deel OAuth app:
```
✅ Add: https://YOUR-NGROK-ID.ngrok.io/auth/deel/callback
```

## Step 4: Update Our Code
We need to handle the ngrok URL in our app.

## Important Notes:
- Keep the ngrok terminal window open while testing
- The ngrok URL changes each time you restart ngrok
- Use the HTTPS version (not HTTP)
