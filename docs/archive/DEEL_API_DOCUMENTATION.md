# Deel API Integration Documentation

## Overview
This document contains comprehensive information about integrating with Deel's API, covering both sandbox and production environments. All information here is based on practical implementation and testing.

---

## 🧪 Deel Sandbox API

### Environment Details
- **Sandbox Base URL**: `https://api-sandbox.demo.deel.com`
- **OAuth Authorization URL**: `https://app.demo.deel.com/oauth2/authorize`
- **OAuth Token URL**: `https://app.demo.deel.com/oauth2/tokens`
- **Developer Console**: `https://app.demo.deel.com/developer-center`

### OAuth 2.0 Implementation

#### Step 1: Create OAuth Application
1. Navigate to `https://app.demo.deel.com/developer-center`
2. Create a new OAuth application (not Personal Access Token)
3. Configure redirect URIs:
   - Production: `https://your-domain.com/auth/deel/callback`
   - Development: `http://localhost:8081/auth/deel/callback`
   - ngrok: `https://your-ngrok-id.ngrok-free.app/auth/deel/callback`

#### Step 2: Authorization Code Flow
```typescript
// Step 1: Redirect user to authorization URL
const authUrl = `https://app.demo.deel.com/oauth2/authorize?` +
  `client_id=${clientId}&` +
  `redirect_uri=${encodeURIComponent(redirectUri)}&` +
  `response_type=code&` +
  `state=${state}&` +
  `scope=${encodeURIComponent(scopes)}`;

window.location.href = authUrl;
```

#### Step 3: Exchange Code for Token
```typescript
// Server-side token exchange (use Basic Auth)
const response = await fetch('https://app.demo.deel.com/oauth2/tokens', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
  },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri
  })
});
```

### Scopes (Confirmed Working)
Based on our comprehensive Personal Access Token, these scopes are available:
- `people:read` - Access employee/people data
- `people:write` - Modify employee data
- `contracts:read` - Access contract information
- `contracts:write` - Modify contracts
- `organizations:read` - Access organization data
- `accounting:read` - Financial data access
- `adjustments:read/write` - Payroll adjustments
- `benefits:read/write` - Employee benefits
- `forms:read` - Access forms and documents
- `global-payroll:read/write` - Payroll management
- `groups:read/write` - Team/group management
- `immigration:read/write` - Immigration status
- `invoice:create` - Invoice generation
- `legal-entity:read/write` - Legal entity management
- `milestones:read/write` - Project milestones
- `off-cycle-payments:read/write` - Special payments
- `payslips:read` - Payroll slips
- `screening:read/write` - Background checks
- `tasks:read/write` - Task management
- `time-off:read/write` - Leave management
- `timesheets:read/write` - Time tracking
- `time-tracking:read/write` - Time tracking
- `webhooks:read/write` - Webhook management

### API Endpoints (✅ Confirmed Working)

#### People/Employees
```typescript
GET /rest/v2/people
// Returns comprehensive employee data including:
// - Personal information (name, email, birth_date)
// - Employment details (job_title, start_date, status)
// - Organizational structure (department, manager, direct_reports)
// - Location data (country, state, addresses)
// - Contract relationships via employments array
```

#### Contracts  
```typescript
GET /rest/v2/contracts
// Returns detailed contract information:
// - Contract metadata (id, title, status, type)
// - Worker associations (worker_name, worker_email)
// - Dates (start_date, end_date, completion_date)
// - Payment terms (rate, currency, scale)
// - Legal entities and teams
```

### Data Structures

#### Employee Object (from /rest/v2/people)
```typescript
interface DeelEmployee {
  id: string;
  created_at: string;
  first_name: string;
  last_name: string;
  full_name: string;
  preferred_first_name?: string;
  preferred_last_name?: string;
  worker_id: string;
  external_id?: string;
  emails: Array<{
    type: 'primary' | 'work' | 'personal';
    value: string;
  }>;
  birth_date: string;
  start_date: string;
  nationalities: string[];
  client_legal_entity: {
    id: string;
    name: string;
  };
  state: string;
  country: string;
  seniority: string;
  direct_manager?: {
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    work_email: string;
  };
  direct_reports: Array<{
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    work_email: string;
  }>;
  direct_reports_count: number;
  department: {
    id: string;
    name: string;
  };
  job_title: string;
  hiring_status: 'active' | 'pending' | 'terminated';
  new_hiring_status: 'active' | 'pending' | 'terminated';
  hiring_type: 'eor' | 'contractor' | 'employee';
  timezone: string;
  addresses: Array<{
    streetAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    country: string;
  }>;
  employments: Array<{
    id: string;
    name: string;
    email: string;
    job_title: string;
    hiring_status: string;
    contract_status: string;
    start_date: string;
    payment: {
      rate: number;
      scale: 'annual' | 'monthly' | 'hourly';
      currency: string;
      contract_name: string;
    };
    team: {
      id: string;
      name: string;
    };
    client_legal_entity: {
      id: string;
      name: string;
    };
  }>;
}
```

#### Contract Object (from /rest/v2/contracts)
```typescript
interface DeelContract {
  id: string;
  title: string;
  name?: string;
  status: 'active' | 'pending' | 'in_progress' | 'terminated';
  type: 'eor' | 'global_payroll' | 'pay_as_you_go_time_based';
  start_date: string;
  end_date?: string;
  completion_date?: string;
  worker_name?: string;
  worker_email?: string;
  team?: {
    id: string;
    name: string;
  };
  client_legal_entity?: {
    id: string;
    name: string;
  };
  payment?: {
    rate: number;
    scale: string;
    currency: string;
    contract_name: string;
  };
  created_at: string;
  updated_at: string;
}
```

### Making Authenticated Requests

#### Using Personal Access Token (PAT)
```typescript
const response = await fetch('https://api-sandbox.demo.deel.com/rest/v2/people', {
  headers: {
    'Authorization': `Bearer ${personalAccessToken}`,
    'Content-Type': 'application/json'
  }
});
```

#### Using OAuth Access Token
```typescript
const response = await fetch('https://api-sandbox.demo.deel.com/rest/v2/people', {
  headers: {
    'Authorization': `Bearer ${oauthAccessToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Important Implementation Notes

#### CORS Restrictions
- **Issue**: Direct browser calls to Deel API are blocked by CORS
- **Solution**: Proxy all API calls through your backend/serverless functions
- **Implementation**: We used Supabase Edge Functions as a proxy

#### Data Mapping Considerations
- **Object Nesting**: API returns nested objects that can't be rendered directly in React
- **Solution**: Extract primitive values (strings/numbers) from nested objects
- **Example**:
  ```typescript
  // ❌ Don't do this - breaks React rendering
  const employee = { ...apiResponse };
  
  // ✅ Do this - extract safe values
  const employee = {
    name: apiResponse.full_name,
    email: apiResponse.emails?.find(e => e.type === 'work')?.value,
    department: apiResponse.department?.name, // Extract string, not object
    manager: apiResponse.direct_manager?.display_name // Extract string, not object
  };
  ```

#### Endpoint Discovery Process
We systematically tested 25+ endpoints to find working ones:

**✅ Working Endpoints:**
- `/rest/v2/people` - Comprehensive employee data
- `/rest/v2/contracts` - Contract information

**❌ Non-Working Endpoints (404):**
- `/api/v1/employees`
- `/api/v1/workers` 
- `/rest/v2/workers`
- `/rest/v2/users`
- `/api/v1/contracts`
- Most `/api/v1/*` endpoints

### Rate Limiting
- **Current Experience**: No rate limiting encountered during development
- **Recommendation**: Implement exponential backoff as best practice
- **Monitor**: Watch for 429 responses in production

### Error Handling
Common error responses:
- `401 Unauthorized` - Invalid or expired token
- `403 Forbidden` - Insufficient permissions/scopes
- `404 Not Found` - Endpoint doesn't exist or no data
- `500 Internal Server Error` - Deel API issues

---

## 🏭 Deel Production API ⚠️ (TO BE CONFIRMED)

### Environment Details (UNCONFIRMED)
- **Production Base URL**: `https://api.letsdeel.com` *(likely)*
- **OAuth Authorization URL**: `https://app.deel.com/oauth2/authorize` *(likely)*
- **OAuth Token URL**: `https://app.deel.com/oauth2/tokens` *(likely)*
- **Developer Console**: `https://app.deel.com/developer-center` *(likely)*

### Key Differences from Sandbox (ASSUMPTIONS)

#### 1. Authentication Requirements
- **Assumption**: Production requires verified business accounts
- **Assumption**: Enhanced security requirements (webhooks, IP whitelisting)
- **Assumption**: More stringent scope approval process

#### 2. Data Differences
- **Assumption**: Real employee data instead of demo data
- **Assumption**: Potentially different field availability
- **Assumption**: Real payment/financial information

#### 3. Rate Limiting
- **Assumption**: Production likely has stricter rate limits
- **Assumption**: May require rate limit headers monitoring
- **Assumption**: Possible API key requirements in addition to OAuth

#### 4. Endpoints
- **Assumption**: Same REST v2 structure (`/rest/v2/people`, `/rest/v2/contracts`)
- **To Verify**: All sandbox endpoints work the same way
- **To Verify**: Additional endpoints may be available in production

### Migration Checklist (UNCONFIRMED)

#### Before Production Deployment:
1. **✅ Account Setup**
   - [ ] Verify production Deel account access
   - [ ] Create production OAuth application
   - [ ] Configure production redirect URIs
   - [ ] Obtain production client credentials

2. **⚠️ API Testing**
   - [ ] Test OAuth flow in production
   - [ ] Verify endpoint availability (`/rest/v2/people`, `/rest/v2/contracts`)
   - [ ] Test data structure consistency
   - [ ] Validate scope requirements

3. **🔒 Security Review**
   - [ ] Review webhook security requirements
   - [ ] Implement proper token storage
   - [ ] Verify HTTPS requirements
   - [ ] Check IP whitelisting requirements

4. **📊 Monitoring Setup**
   - [ ] Implement API rate limit monitoring
   - [ ] Set up error tracking for production API calls
   - [ ] Create alerting for authentication failures

### Code Changes for Production

#### Environment Configuration
```typescript
const config = {
  sandbox: {
    baseUrl: 'https://api-sandbox.demo.deel.com',
    authUrl: 'https://app.demo.deel.com/oauth2/authorize',
    tokenUrl: 'https://app.demo.deel.com/oauth2/tokens'
  },
  production: {
    baseUrl: 'https://api.letsdeel.com', // TO BE CONFIRMED
    authUrl: 'https://app.deel.com/oauth2/authorize', // TO BE CONFIRMED  
    tokenUrl: 'https://app.deel.com/oauth2/tokens' // TO BE CONFIRMED
  }
};
```

#### Feature Flags
```typescript
const useProduction = process.env.NODE_ENV === 'production' && 
                     process.env.DEEL_USE_PRODUCTION === 'true';
```

---

## 🔧 Technical Implementation

### Our Current Architecture

#### Frontend (React/TypeScript)
- OAuth initiation and callback handling
- Data display in tabbed interface
- Token management via localStorage
- Error handling and user feedback

#### Backend (Supabase Edge Functions)
- **deel-oauth**: Handles OAuth token exchange
- **deel-api**: Proxies API calls to bypass CORS
- **deel-api-test**: Endpoint discovery and testing
- Database storage for credentials and tokens

#### Security Considerations
- Tokens stored in Supabase database with RLS
- Client credentials in environment variables
- OAuth state parameter for CSRF protection
- HTTPS-only for all OAuth flows

### Lessons Learned

1. **Always proxy API calls** - Direct browser calls fail due to CORS
2. **Extract primitive values** - Don't spread entire API responses into React components
3. **Test endpoints systematically** - Not all documented endpoints work
4. **Use sandbox extensively** - Production differences can be significant
5. **Implement proper error handling** - API responses vary significantly
6. **Store minimal data** - Only keep necessary fields to avoid object rendering issues

---

## 📚 Additional Resources

- [Deel API Documentation](https://developer.deel.com/) - Official docs
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749) - Standard reference
- [Our Implementation](./src/lib/api.ts) - Working code examples

---

## ⚠️ Important Notes

1. **Sandbox vs Production**: This documentation is based on sandbox testing. Production behavior needs verification.

2. **API Stability**: Deel's API is evolving. Endpoint availability and data structures may change.

3. **Rate Limiting**: We haven't hit rate limits in sandbox. Production limits are unknown.

4. **Scopes**: Scope requirements may differ between sandbox and production.

5. **Support**: For production issues, contact Deel's API support team.

---

*Last Updated: January 2025*
*Based on: Deel Sandbox API testing and implementation*