# Development Tools Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Ngrok Setup & Configuration](#ngrok-setup--configuration)
3. [OAuth App Configuration](#oauth-app-configuration)
4. [Local Development Testing](#local-development-testing)
5. [Troubleshooting Common Issues](#troubleshooting-common-issues)
6. [Advanced Development Scenarios](#advanced-development-scenarios)

---

## 🛠️ Overview

This guide covers essential development tools and configurations needed for local development, testing, and OAuth integration with the ComplyAI platform. The primary focus is on **ngrok** for secure tunneling and **OAuth application configuration** for Deel API integration.

### Why These Tools Are Needed

#### Ngrok Tunneling
- **OAuth Requirement**: Deel's OAuth system doesn't accept `localhost` redirect URIs
- **HTTPS Requirement**: OAuth flows require HTTPS endpoints for security
- **Testing**: Enables testing OAuth flows in local development environment
- **Webhooks**: Allows external services to send webhooks to local development

#### OAuth App Configuration
- **Development vs Production**: Different redirect URIs for different environments
- **Security**: Proper OAuth configuration prevents security vulnerabilities
- **Testing**: Enables comprehensive testing of authentication flows

---

## 🌐 Ngrok Setup & Configuration

### Prerequisites

- ngrok account (free tier available)
- ngrok CLI installed on your system
- Active internet connection

### Step 1: Install ngrok

#### Using Homebrew (macOS)
```bash
brew install ngrok/ngrok/ngrok
```

#### Using npm (Cross-platform)
```bash
npm install -g ngrok
```

#### Direct Download
Visit https://ngrok.com/download and download the appropriate version for your system.

### Step 2: Set up ngrok Authentication

1. **Get your authentication token**:
   - Go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authentication token

2. **Configure ngrok with your token**:
   ```bash
   ngrok config add-authtoken YOUR_TOKEN_HERE
   ```

### Step 3: Start ngrok Tunnel

#### For Development Server (Port 5173)
```bash
# Start tunnel for Vite development server
ngrok http 5173
```

#### For Alternative Port (Port 8081)
```bash
# If using different port
ngrok http 8081
```

### Step 4: Get Your Public URL

After running ngrok, you'll see output like:
```
ngrok                                                           (Ctrl+C to quit)

Session Status                online
Account                       your-email@example.com (Plan: Free)
Version                       3.0.0
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-def456.ngrok-free.app -> http://localhost:5173
Forwarding                    http://abc123-def456.ngrok-free.app -> http://localhost:5173

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Important**: Copy the **HTTPS** URL (e.g., `https://abc123-def456.ngrok-free.app`)

### Step 5: Keep ngrok Running

- **Keep the terminal window open** while testing
- The ngrok URL **changes each time** you restart ngrok
- Use the **HTTPS version** (not HTTP) for OAuth

### Advanced ngrok Configuration

#### Custom Subdomain (Paid Plan)
```bash
ngrok http 5173 --subdomain=myapp-dev
# Results in: https://myapp-dev.ngrok.io
```

#### Configuration File
Create `~/.ngrok2/ngrok.yml`:
```yaml
version: "2"
authtoken: YOUR_AUTH_TOKEN
tunnels:
  webapp:
    addr: 5173
    proto: http
    bind_tls: true
    subdomain: myapp-dev
```

Start with config:
```bash
ngrok start webapp
```

#### Multiple Tunnels
```bash
# Terminal 1: Frontend
ngrok http 5173

# Terminal 2: Backend (if needed)
ngrok http 3001
```

---

## ⚙️ OAuth App Configuration

### Deel OAuth App Setup

#### Step 1: Access Deel Developer Portal
1. Go to: https://app.demo.deel.com/developer-center (for sandbox)
2. Or: https://app.deel.com/developer-center (for production)
3. Sign in with your Deel admin credentials

#### Step 2: Find Your OAuth Application
1. Look for your existing app with Client ID: `9e6d498b-cc67-489c-ac64-d44c7a2b2a4b`
2. Click "Edit" or "Manage" to modify settings

#### Step 3: Configure Redirect URIs

Add **ALL** of these redirect URIs to support different environments:

```
# Local Development
http://localhost:5173/auth/deel/callback

# Alternative Local Port
http://localhost:8081/auth/deel/callback

# ngrok Testing (Update with YOUR ngrok URL)
https://YOUR-NGROK-ID.ngrok-free.app/auth/deel/callback

# Production
https://comply-copilot-ai.lovable.app/auth/deel/callback
```

**⚠️ Important Notes:**
- Use **HTTP** for localhost URLs (not HTTPS)
- Use **HTTPS** for ngrok URLs (not HTTP)
- Update the ngrok URL each time you restart ngrok
- Keep all URLs for different testing scenarios

#### Step 4: Verify Scopes

Ensure your OAuth app has these scopes enabled:
```
contracts:read contracts:write organizations:read people:read people:write
accounting:read benefits:read benefits:write payroll:read timesheets:read
webhooks:write time-off:read time-off:write
```

### Updating OAuth Configuration

#### Quick Update Process
1. **Get new ngrok URL** from terminal output
2. **Go to Deel Developer Portal**
3. **Edit your OAuth app**
4. **Add/update the ngrok redirect URI**:
   ```
   https://NEW-NGROK-ID.ngrok-free.app/auth/deel/callback
   ```
5. **Save changes**
6. **Test OAuth flow**

#### Environment-Specific Configuration

The application automatically detects the environment and uses the appropriate redirect URI:

```typescript
// Auto-detection logic in src/lib/api.ts
const currentOrigin = window.location.origin;
const isLocalhost = window.location.hostname === 'localhost';
const isNgrok = window.location.hostname.includes('.ngrok');

let redirectUri;
if (currentOrigin.includes('636c85911d89.ngrok-free.app')) {
  // Specific ngrok URL (if hardcoded)
  redirectUri = 'https://636c85911d89.ngrok-free.app/auth/deel/callback';
} else if (isLocalhost) {
  // Localhost development
  redirectUri = `${currentOrigin}/auth/deel/callback`;
} else if (isNgrok) {
  // Dynamic ngrok detection
  redirectUri = `${currentOrigin}/auth/deel/callback`;
} else {
  // Production
  redirectUri = 'https://comply-copilot-ai.lovable.app/auth/deel/callback';
}
```

---

## 🧪 Local Development Testing

### Complete Testing Workflow

#### Step 1: Start Development Environment
```bash
# Terminal 1: Start development server
npm run dev

# Terminal 2: Start ngrok tunnel
ngrok http 5173
```

#### Step 2: Update OAuth Configuration
1. Copy the ngrok HTTPS URL from terminal
2. Update Deel OAuth app with new redirect URI
3. Verify the URL is saved correctly

#### Step 3: Test OAuth Flow
1. **Access via ngrok URL**: `https://YOUR-NGROK-ID.ngrok-free.app`
2. **Navigate to Deel Dashboard**
3. **Click "Initialize Credentials"** (should work without errors)
4. **Click "Authorize with Deel"** (should redirect to Deel)
5. **Complete authorization** on Deel's site
6. **Verify successful callback** and data loading

#### Step 4: Verify Integration
- ✅ No "Invalid redirect URI" errors
- ✅ Successful OAuth authorization popup/redirect
- ✅ Token exchange completes successfully
- ✅ Employee and contract data loads
- ✅ No CORS errors in browser console

### Testing Different Environments

#### Localhost Testing
```bash
# Access via localhost (for general development)
http://localhost:5173

# Note: OAuth will fail without proper redirect URI setup
```

#### ngrok Testing
```bash
# Access via ngrok (for OAuth testing)
https://your-ngrok-id.ngrok-free.app

# OAuth should work with proper configuration
```

#### Production Testing
```bash
# Access production deployment
https://comply-copilot-ai.lovable.app

# OAuth should work with production redirect URI
```

### Development Server Configuration

#### Vite Configuration for ngrok
Update `vite.config.ts` if needed:
```typescript
export default defineConfig({
  server: {
    host: true, // Allow external connections
    port: 5173,
    cors: true
  },
  // ... other config
});
```

#### Environment Variables for Development
```env
# .env.local for development
VITE_SUPABASE_URL=https://eufsshczsdzfxmlkbpey.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_DEEL_SANDBOX_URL=https://api-sandbox.demo.deel.com
```

---

## 🔧 Troubleshooting Common Issues

### ngrok Issues

#### Issue: "ngrok not found" Error
**Solutions**:
```bash
# Check if ngrok is installed
which ngrok

# Install if missing
brew install ngrok/ngrok/ngrok
# or
npm install -g ngrok
```

#### Issue: "Authentication failed" Error
**Solutions**:
1. Get new auth token from https://dashboard.ngrok.com/get-started/your-authtoken
2. Configure with token:
   ```bash
   ngrok config add-authtoken YOUR_NEW_TOKEN
   ```

#### Issue: ngrok URL Changes Every Restart
**Solutions**:
1. **Free tier**: URL changes are normal, update OAuth app each time
2. **Paid tier**: Use custom subdomain for consistent URLs
3. **Workaround**: Use environment variable for dynamic URL detection

#### Issue: "Too many connections" Error
**Solutions**:
1. Close unused ngrok tunnels
2. Restart ngrok
3. Check ngrok dashboard for active tunnels
4. Upgrade to paid plan if needed

### OAuth Configuration Issues

#### Issue: "Invalid redirect URI for authorization"
**Solutions**:
1. **Verify exact URL match** in Deel OAuth app settings
2. **Check protocol**: Use HTTPS for ngrok, HTTP for localhost
3. **Copy-paste ngrok URL** to avoid typos
4. **Wait a few minutes** after updating Deel app settings

#### Issue: OAuth popup blocked
**Solutions**:
1. **Allow popups** for your domain in browser settings
2. **Disable popup blockers** temporarily
3. **Try different browser** (Chrome, Firefox, Safari)
4. **Check browser security settings**

#### Issue: "Client ID not found" Error
**Solutions**:
1. **Verify Client ID** matches OAuth app: `9e6d498b-cc67-489c-ac64-d44c7a2b2a4b`
2. **Check environment** (sandbox vs production)
3. **Verify OAuth app is active** in Deel developer console

### Network and CORS Issues

#### Issue: CORS errors in browser console
**Solutions**:
1. **Use Edge Function proxy** - never call Deel API directly from browser
2. **Check API calls** go through `/functions/v1/deel-api`
3. **Verify authentication** before making API calls

#### Issue: "Failed to fetch" errors
**Solutions**:
1. **Check internet connection**
2. **Verify ngrok tunnel is active**
3. **Check firewall settings**
4. **Try different network** (mobile hotspot)

#### Issue: SSL certificate errors with ngrok
**Solutions**:
1. **Use HTTPS ngrok URL** (not HTTP)
2. **Accept certificate** if browser shows warning
3. **Update browser** to latest version
4. **Try incognito/private mode**

### Development Environment Issues

#### Issue: "Module not found" errors after ngrok setup
**Solutions**:
1. **Restart development server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```
2. **Clear npm cache**:
   ```bash
   npm run build
   ```

#### Issue: Hot reload not working via ngrok
**Solutions**:
1. **Check Vite configuration** allows external connections
2. **Restart development server**
3. **Use localhost for development**, ngrok only for OAuth testing

### OAuth Flow Debugging

#### Enable Debug Logging
```typescript
// Add to src/lib/api.ts for debugging
console.log('🚀 OAuth URL:', authUrl.toString());
console.log('🔄 Redirect URI:', redirectUri);
console.log('🎯 Current origin:', window.location.origin);
console.log('🔍 Environment detection:', { isLocalhost, isNgrok });
```

#### Check Browser Network Tab
1. **Open Developer Tools** (F12)
2. **Go to Network tab**
3. **Monitor requests** during OAuth flow
4. **Look for failed requests** (red entries)
5. **Check response headers** for CORS issues

#### Verify Token Exchange
```typescript
// Check if tokens are stored correctly
const { data: tokens } = await supabase
  .from('deel_tokens')
  .select('*')
  .eq('user_id', user.id);
console.log('Stored tokens:', tokens);
```

---

## 🚀 Advanced Development Scenarios

### Multiple Developer Setup

#### Different Ports for Different Developers
```bash
# Developer 1
npm run dev -- --port 5173
ngrok http 5173

# Developer 2  
npm run dev -- --port 5174
ngrok http 5174
```

#### Shared ngrok Configuration
Use a shared configuration file for team consistency:
```yaml
# shared-ngrok.yml
version: "2"
tunnels:
  webapp-dev1:
    addr: 5173
    proto: http
    bind_tls: true
  webapp-dev2:
    addr: 5174
    proto: http
    bind_tls: true
```

### Production-like Testing

#### Using Custom Domain with ngrok (Paid)
```bash
ngrok http 5173 --hostname=dev.yourcompany.com
```

#### Environment Switching
```bash
# Switch to production API for testing
export VITE_DEEL_USE_PRODUCTION=true
npm run dev
```

### Automated Development Setup

#### Development Startup Script
Create `dev-setup.sh`:
```bash
#!/bin/bash

# Start development server in background
npm run dev &
DEV_PID=$!

# Wait for dev server to start
sleep 5

# Start ngrok tunnel
ngrok http 5173 &
NGROK_PID=$!

# Function to cleanup on exit
cleanup() {
    kill $DEV_PID
    kill $NGROK_PID
    exit
}

# Set trap to cleanup on script exit
trap cleanup INT TERM

# Wait for processes
wait
```

Make executable and run:
```bash
chmod +x dev-setup.sh
./dev-setup.sh
```

### CI/CD Integration

#### GitHub Actions with ngrok
```yaml
# .github/workflows/test-oauth.yml
name: Test OAuth Flow
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    - name: Install dependencies
      run: npm install
    - name: Start development server
      run: npm run dev &
    - name: Setup ngrok
      run: |
        wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip
        unzip ngrok-stable-linux-amd64.zip
        ./ngrok authtoken ${{ secrets.NGROK_AUTH_TOKEN }}
        ./ngrok http 5173 &
    - name: Run OAuth tests
      run: npm run test:oauth
```

---

## 📚 Additional Resources

### ngrok Documentation
- **[ngrok Official Docs](https://ngrok.com/docs)** - Complete ngrok documentation
- **[ngrok Dashboard](https://dashboard.ngrok.com/)** - Manage tunnels and auth tokens
- **[ngrok Pricing](https://ngrok.com/pricing)** - Free vs paid plan features

### OAuth Documentation
- **[Deel API Docs](https://developer.deel.com/)** - Official Deel API documentation
- **[OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)** - OAuth standard
- **[Deel Integration Guide](./DEEL_INTEGRATION_GUIDE.md)** - Our complete integration guide

### Development Resources
- **[Vite Documentation](https://vitejs.dev/)** - Frontend build tool
- **[React Router](https://reactrouter.com/)** - Client-side routing
- **[Development Guide](./DEVELOPMENT.md)** - Complete development setup

---

## ✅ Success Checklist

### ngrok Setup Complete
- [ ] ngrok installed and authenticated
- [ ] Tunnel running and accessible via HTTPS
- [ ] URL copied and ready for OAuth configuration

### OAuth App Configuration Complete
- [ ] Redirect URIs added for all environments
- [ ] Scopes configured correctly
- [ ] Client credentials secured

### Development Environment Ready
- [ ] Development server running
- [ ] ngrok tunnel active
- [ ] OAuth flow tested end-to-end
- [ ] Data loading successfully

### Ready for Development
- [ ] Can access app via ngrok URL
- [ ] OAuth authorization works
- [ ] API calls succeed
- [ ] No CORS or authentication errors

---

*Last Updated: January 2025*  
*Status: ✅ Ready for Development and Testing*