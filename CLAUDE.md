# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ComplyAI is an AI-powered HR compliance automation platform that integrates with Deel's workforce management system. Built with React/TypeScript frontend, Supabase backend, and Edge Functions for API proxying.

## Development Commands

### Core Development
- `npm run dev` - Start development server on port 8081
- `npm run build` - Production build
- `npm run build:dev` - Development build with source maps
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Embedding Scripts
- `npm run backfill-embeddings` - Process documents and generate embeddings
- `npm run backfill-embeddings:dry-run` - Test embedding process without writing to DB

### Supabase Edge Functions
- `npx supabase functions deploy` - Deploy all functions
- `npx supabase functions deploy [function-name]` - Deploy specific function
- Key functions: `deel-api`, `compliance-review`, `rag-query`, `admin-upload-file`

## Architecture Overview

### Frontend Structure
- **React 18** with TypeScript and Vite build system
- **UI Components**: shadcn/ui with Radix UI primitives
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router DOM with protected routes
- **Styling**: Tailwind CSS with custom theme

### Backend Integration
- **Supabase**: PostgreSQL database with Row Level Security
- **Authentication**: Supabase Auth with OAuth providers (Google, Deel)
- **Edge Functions**: Deno-based serverless functions for API proxying
- **AI Integration**: Google Gemini Flash for compliance analysis

### Key API Integrations
- **Deel API**: Employee/contract data via OAuth 2.0 with PAT fallback
- **RAG System**: Document upload, chunking, and semantic search
- **Compliance AI**: Automated compliance review and recommendations

## Important File Locations

### Configuration
- `vite.config.ts` - Vite configuration with ngrok support for OAuth testing
- `supabase/config.toml` - Supabase function configuration
- `tsconfig.json` - TypeScript with relaxed strictness for rapid development

### Core Components
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/lib/api.ts` - API utilities and Deel integration types
- `src/lib/supabase.ts` - Supabase client configuration
- `src/components/MainDashboard.tsx` - Main dashboard with compliance data

### Supabase Functions
- `supabase/functions/deel-api/` - Deel API proxy with authentication
- `supabase/functions/compliance-review/` - AI-powered compliance analysis
- `supabase/functions/rag-query/` - RAG system for document Q&A
- `supabase/functions/admin-upload-file/` - Document processing pipeline

## Development Workflow

### Local Setup
1. Run `npm install` to install dependencies
2. Configure environment variables (see README.md)
3. Use `npm run dev` to start development server
4. Use ngrok for OAuth testing: `ngrok http 8081`

### Testing OAuth Flows
- Development server allows ngrok domains in `vite.config.ts:14-16`
- Deel OAuth requires ngrok for local testing due to redirect URI requirements
- Update Deel app settings with ngrok URL format

### Database Schema
- Employee and contract data stored with compliance metadata
- Document chunks stored with vector embeddings for RAG
- User credentials encrypted for secure API access

## Code Patterns

### API Calls
All external API calls go through Supabase Edge Functions to handle CORS and authentication:
```typescript
// Use edge function proxy instead of direct API calls
const response = await supabase.functions.invoke('deel-api', {
  body: { endpoint: '/employees', method: 'GET' }
});
```

### Authentication Flow
- React Context provides auth state across components
- Protected routes check authentication status
- Token management handled in `src/lib/api.ts:setUserToken`

### Component Structure
- Page components in `src/pages/`
- Reusable UI components from shadcn/ui in `src/components/ui/`
- Business logic components in `src/components/`

## Common Development Tasks

### Adding New Compliance Rules
1. Extend types in `src/lib/api.ts`
2. Update compliance analysis in `supabase/functions/compliance-review/`
3. Add UI components to display results

### Document Processing
- Upload handling in `src/pages/AdminPage.tsx`
- Processing pipeline in `supabase/functions/process-document/`
- RAG queries in `src/components/KnowledgeBaseChat.tsx`

### Deel API Integration
- OAuth flow handled in `src/pages/DeelCallback.tsx`
- API proxy in `supabase/functions/deel-api/`
- Data display in `src/pages/EmployeesPage.tsx` and `src/pages/ContractsPage.tsx`

## Environment Variables Required

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

## Security Considerations

- All API credentials stored encrypted in Supabase
- Row Level Security (RLS) enforced on all tables
- OAuth flows use state parameter for CSRF protection
- Deel API calls proxied through Edge Functions to avoid exposing credentials