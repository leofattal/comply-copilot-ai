# Fix Compliance Analysis Errors

## 🚨 Issues Found

1. **500 Error**: Missing Personal Access Token in deel_credentials
2. **Missing Environment Variable**: GEMINI_API_KEY not set
3. **400 Error**: OAuth request issues

## ✅ Quick Fixes

### 1. Set GEMINI_API_KEY in Supabase

**Steps:**
1. Get API key: https://aistudio.google.com/app/apikey
2. Go to: https://supabase.com/dashboard/project/eufsshczsdzfxmlkbpey/settings/functions
3. Add Environment Variable:
   - Key: `GEMINI_API_KEY`
   - Value: `your_gemini_api_key`

### 2. Fix Personal Access Token

**Option A: Use Settings Page**
- Go to Settings in your app
- Configure Deel Personal Access Token
- This will populate the missing field

**Option B: Update Database Directly**
```sql
-- Update the user without PAT token
UPDATE deel_credentials 
SET personal_access_token = 'your_deel_pat_token_here'
WHERE user_id = '1e2bb2d2-a205-46c3-8d74-a078336e074b';
```

### 3. Redeploy Edge Functions

After setting environment variables:
```bash
supabase functions deploy compliance-review
supabase functions deploy deel-oauth
```

## 🧪 Test Compliance Analysis

After fixes:
1. Try running compliance analysis
2. Check browser console for errors
3. Verify function logs show success

## 📋 User with Valid Setup

User `0faee2b4-e71f-47eb-946c-a3922f0f7dbc` has valid PAT token and should work once GEMINI_API_KEY is set.