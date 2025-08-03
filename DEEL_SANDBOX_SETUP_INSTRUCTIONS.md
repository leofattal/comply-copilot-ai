# Deel API Sandbox Setup Instructions

**For Client: Setting Up Deel Developer Access**

Dear [Client Name],

To integrate your HR compliance platform with Deel's API, we need you to set up a developer sandbox environment and provide us with the necessary API credentials. Please follow these step-by-step instructions:

## Prerequisites
- You must have an active Deel account with admin privileges
- Access to your company email for verification
- Approximately 15-20 minutes to complete setup

---

## Step 1: Access Deel Developer Portal

1. **Navigate to Deel Developer Portal**
   - Go to: https://developer.deel.com/docs/welcome
   - Click "Get Started" or "API Reference" in the top navigation

2. **Sign In to Your Deel Account**
   - Click "Sign In" (top right corner)
   - Use your existing Deel admin credentials
   - If you don't have admin access, contact your Deel account manager

## Step 2: Create Developer Application

1. **Access Developer Dashboard**
   - Once signed in, look for "Developer Dashboard" or "My Apps"
   - If you don't see this option, you may need to request developer access
   - Contact Deel support at developer-support@deel.com if needed

2. **Create New Application**
   - Click "Create New App" or "New Application"
   - Fill in the application details:
     * **App Name**: "HR Compliance Automation Platform"
     * **Description**: "AI-powered HR compliance audit and monitoring system"
     * **App Type**: Select "Web Application"
     * **Company**: [Your Company Name]

3. **Configure OAuth Settings**
   - **Redirect URLs**: Add these URLs (we'll provide final URLs later):
     * `http://localhost:5173/auth/deel/callback` (for development)
     * `https://[your-domain].com/auth/deel/callback` (for production)
   - **Scopes**: Request access to the following (check all that apply):
     * ✅ `employees:read` - Read employee information
     * ✅ `contracts:read` - Read contract details
     * ✅ `payroll:read` - Read payroll information
     * ✅ `org:read` - Read organization details
     * ✅ `timesheets:read` - Read timesheet data
     * ✅ `webhooks:write` - Create webhooks for real-time updates

## Step 3: Obtain API Credentials

After creating your application, you'll receive:

1. **Client ID** (Public identifier)
2. **Client Secret** (Keep this confidential!)
3. **Sandbox API Base URL**: `https://api.sandbox.deel.com`

**⚠️ IMPORTANT SECURITY NOTE:**
- Never share your Client Secret in emails, chat, or version control
- We'll provide a secure method to share these credentials

## Step 4: Enable Sandbox Environment

1. **Switch to Sandbox Mode**
   - In your developer dashboard, ensure you're in "Sandbox" mode
   - Look for a toggle or dropdown that says "Sandbox" vs "Production"
   - All testing will be done in sandbox first

2. **Create Test Data (Optional)**
   - Deel sandbox may come with sample employee data
   - If not, you can create test employees/contractors for testing
   - This helps us validate the integration without affecting real data

## Step 5: Webhook Configuration

1. **Set Up Webhook Endpoint**
   - In your app settings, find "Webhooks" section
   - We'll provide you with a webhook URL later, but for now, note this capability exists
   - Webhooks will notify our system of real-time changes in your Deel account

## Step 6: API Documentation Access

1. **Review Available Endpoints**
   - Familiarize yourself with: https://developer.deel.com/docs/welcome
   - Key sections we'll be using:
     * **Contractors** - For independent contractor data
     * **EOR** - For employee data
     * **Global Payroll** - For payroll employee data
     * **Webhooks** - For real-time updates

## Information to Provide to Development Team

Please securely share the following information with us:

### 🔑 **API Credentials** (Share via secure method only)
```
Client ID: [Your Client ID]
Client Secret: [Your Client Secret - DO NOT email this]
Sandbox Base URL: https://api.sandbox.deel.com
```

### 📋 **Account Information**
- Deel account type (EOR, Contractors, Global Payroll, or combination)
- Primary countries/jurisdictions where you have employees
- Approximate number of employees/contractors
- Departments or organizational structure in Deel

### 🏢 **Organizational Details**
- Company name as it appears in Deel
- Primary contact person for technical integration
- Preferred communication method for integration updates

### ⚙️ **Integration Preferences**
- Which employee data fields are most critical for compliance
- Preferred audit frequency (daily, weekly, monthly)
- Specific compliance areas of concern (wage/hour, classification, etc.)
- Any sensitive data handling requirements

## Step 7: Secure Credential Sharing

**DO NOT email credentials directly.** Instead, use one of these secure methods:

### Option A: Encrypted File Sharing
1. Create a password-protected document with credentials
2. Share file via secure service (Dropbox, Google Drive with restricted access)
3. Share password separately via phone or different communication channel

### Option B: Secure Communication Platform
1. Use your company's secure communication tool (Slack, Teams, etc.)
2. Share credentials in a private, encrypted channel
3. Delete messages after confirmation of receipt

### Option C: Password Manager
1. Use a business password manager (1Password, Bitwarden Business)
2. Share credentials via secure sharing feature
3. Set expiration date for shared access

## Troubleshooting Common Issues

### Issue: Cannot Access Developer Portal
**Solution**: Contact your Deel Customer Success Manager or email developer-support@deel.com

### Issue: Missing Required Scopes
**Solution**: Review the scopes list in Step 2.3 and ensure all are selected

### Issue: Sandbox Data Not Available
**Solution**: Contact Deel support to enable sandbox test data for your account

### Issue: Webhook Setup Confusion
**Solution**: This can be configured later during integration - not required for initial setup

## Next Steps After Setup

Once you provide the credentials:

1. **Week 1**: We'll configure our development environment and test basic connectivity
2. **Week 2**: We'll implement OAuth authentication flow and test with your sandbox
3. **Week 3**: We'll begin pulling employee data and building compliance analysis features
4. **Ongoing**: Regular updates on integration progress and testing results

## Support Contacts

- **Deel Developer Support**: developer-support@deel.com
- **Deel Documentation**: https://developer.deel.com/docs/welcome
- **Our Development Team**: [Your contact information]

## Security & Compliance Notes

✅ All data exchange will be encrypted in transit (HTTPS/TLS)  
✅ We follow SOC 2 Type II security practices  
✅ GDPR compliance for EU employee data  
✅ Regular security audits and penetration testing  
✅ Role-based access control for sensitive data  

---

**Estimated Time to Complete**: 15-20 minutes  
**Required Permissions**: Deel Admin Access  
**Support Available**: [Your support hours/contact method]

Thank you for your cooperation in setting up this integration. This will enable powerful AI-driven compliance monitoring that helps prevent violations before they occur.

Best regards,  
[Your Development Team]

---

## Appendix: Technical Details (For Reference)

### API Rate Limits
- Sandbox: 100 requests per minute
- Production: Varies by plan (typically 1000+ requests per minute)

### Data Retention
- Sandbox data may be reset periodically
- Production data retention follows Deel's standard policies

### Integration Architecture
```
Your Deel Account → Deel API → Our Platform → AI Analysis → Compliance Reports
```

### Supported Deel Products
- ✅ EOR (Employer of Record)
- ✅ Independent Contractors
- ✅ Global Payroll
- ✅ All geographic regions Deel supports