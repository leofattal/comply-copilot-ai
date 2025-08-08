# Admin Upload & RAG Pipeline Guide

This guide covers the new admin upload and RAG (Retrieval-Augmented Generation) pipeline feature that allows administrators to upload documents and provides AI-powered question answering based on the uploaded content.

## Overview

The system includes:
- **Admin Panel**: Upload files or submit URLs for processing
- **Document Processing**: Automatic text extraction and chunking
- **Vector Embeddings**: Gemini-powered semantic embeddings
- **RAG Query System**: AI-powered Q&A with source citations
- **Knowledge Base Chat**: Interactive chat interface for querying documents

## Prerequisites

### Environment Variables

Create a `.env` file (based on `.env.example`) with:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI Configuration  
GEMINI_API_KEY=your-gemini-api-key
```

### Admin User Setup

To access the admin panel, your user account needs admin privileges:

1. Sign up/login to your application
2. In Supabase, go to Authentication > Users
3. Find your user and edit the `raw_user_meta_data` field
4. Add: `{"role": "admin"}`
5. Save the changes

## Features

### 1. Admin Panel (`/admin`)

**File Upload:**
- Supports: PDF, DOCX, DOC, HTML, TXT
- Max file size: 50MB
- Automatic processing and vectorization

**URL Submission:**
- Submit public URLs for content extraction
- Supports HTML and plain text content
- Automatic content fetching and storage

**Processing Status:**
- Real-time status monitoring
- View document chunks and embeddings
- Error tracking and retry functionality

### 2. Document Processing Pipeline

**Text Extraction:**
- PDF: Basic extraction (placeholder for full implementation)
- DOCX/DOC: Document parsing (placeholder for full implementation) 
- HTML: Tag removal and text extraction
- TXT: Direct text processing

**Chunking:**
- ~800 tokens per chunk with 100 token overlap
- Sentence boundary preservation
- Section path tracking

**Embeddings:**
- Gemini `text-embedding-004` model
- 768-dimensional vectors
- Normalized for cosine similarity
- Automatic retry with error handling

### 3. Knowledge Base Chat (`/dashboard/knowledge-base`)

**Features:**
- Natural language querying
- Source citations with similarity scores
- Real-time response generation
- Context-aware conversations

**Query Examples:**
- "What are the data retention requirements?"
- "How should we handle data breaches?"
- "What training is required for data protection?"

## Quick Start Guide

### Step 1: Access Admin Panel

1. Navigate to `/admin` (requires admin role)
2. You'll see three tabs: File Upload, URL Submission, Ingestion Status

### Step 2: Upload Test Document

1. Go to "File Upload" tab
2. Drag and drop the provided test file: `test-documents/sample-compliance-policy.html`
3. Click "Upload All" 
4. Monitor processing status in "Ingestion Status" tab

### Step 3: Process Document (if needed)

1. If document status shows "pending", click the Play button to trigger processing
2. Processing includes text extraction, chunking, and embedding generation
3. Status will change to "ready" when complete

### Step 4: Test RAG Queries

1. Navigate to `/dashboard/knowledge-base`
2. Try asking questions about the uploaded policy:
   - "What are the data processing principles?"
   - "How long do we have to respond to data subject requests?"
   - "What steps should be taken during a data breach?"

### Step 5: Review Sources

1. Click "View Sources" in chat responses
2. See similarity scores and document sections
3. Verify accuracy of retrieved context

## API Endpoints

### Admin Endpoints (Supabase Edge Functions)

- `POST /functions/v1/admin-upload-file` - Upload files
- `POST /functions/v1/admin-submit-url` - Submit URLs  
- `GET /functions/v1/admin-ingest-status` - Get document status
- `GET /functions/v1/admin-document-chunks/{docId}` - Get document chunks
- `DELETE /functions/v1/admin-ingest-status/{docId}` - Delete document

### Processing & Query Endpoints

- `POST /functions/v1/process-document` - Process uploaded document
- `POST /functions/v1/rag-query` - Perform RAG queries

## Database Schema

### Tables Created

**`docs`** - Document metadata
- `doc_id` (UUID, PK)
- `uri` (text) - File path or URL
- `title` (text) - Document title
- `uploaded_by` (UUID) - User ID
- `status` (enum) - 'pending' | 'ready' | 'error'
- `error_message` (text) - Error details
- `created_at`, `updated_at` (timestamps)

**`doc_chunks`** - Document chunks with embeddings
- `chunk_id` (serial, PK)
- `doc_id` (UUID, FK)
- `section_path` (text) - Section identifier
- `content` (text) - Chunk content
- `tokens` (int) - Token count
- `embedding` (vector(768)) - Gemini embedding
- `tsv` (tsvector) - Full-text search
- `created_at` (timestamp)

### Storage Buckets

- `compliance-raw` - Original uploaded files
- `compliance-processed` - Processed content (optional)

## Utilities

### Backfill Embeddings Script

Generate embeddings for existing chunks:

```bash
# Dry run (no changes)
npm run backfill-embeddings:dry-run

# Run with default settings  
npm run backfill-embeddings

# Custom batch size and delay
npm run backfill-embeddings -- --batch-size 10 --delay 500
```

### Vector Similarity Function

The system includes a PostgreSQL function for efficient vector search:

```sql
SELECT * FROM match_chunks(
  query_embedding => '[0.1, 0.2, ...]'::vector(768),
  match_threshold => 0.3,
  match_count => 10
);
```

## Troubleshooting

### Common Issues

**Admin Access Denied:**
- Verify user has `role: 'admin'` in `raw_user_meta_data`
- Check authentication token is valid

**Document Processing Fails:**
- Check Gemini API key is configured
- Verify file format is supported
- Review Edge Function logs in Supabase

**Empty RAG Responses:**
- Ensure documents have been processed successfully
- Check embedding generation completed
- Verify similarity threshold isn't too high

**Vector Search Not Working:**
- Confirm `vector` extension is enabled
- Check `match_chunks` function exists
- Verify embeddings are properly normalized

### Error Logs

Check Supabase Edge Function logs:
1. Go to Supabase Dashboard
2. Navigate to Edge Functions
3. Select function and view logs
4. Look for error details and stack traces

## Performance Considerations

### Rate Limiting
- Gemini API has rate limits
- Processing includes 100ms delays between chunks
- Consider implementing queue for large documents

### Storage Costs
- Vector embeddings require significant storage
- Consider cleanup policies for old documents
- Monitor storage usage in Supabase

### Query Performance
- Vector similarity search is optimized with HNSW index
- Full-text search available as fallback
- Consider result caching for common queries

## Security Notes

### Access Control
- Admin functions protected by RLS policies
- Only users with `role: 'admin'` can upload
- Storage buckets have admin-only policies

### Data Privacy
- Uploaded documents stored securely in Supabase
- Embeddings don't contain readable text
- Consider data retention policies

### API Security
- All Edge Functions require authentication
- CORS headers configured appropriately
- Input validation on all endpoints

## Next Steps

1. **Enhanced Text Extraction**: Implement proper PDF and DOCX parsing
2. **Document Management**: Add batch operations and folder organization  
3. **Advanced RAG**: Implement re-ranking and multi-step reasoning
4. **Analytics**: Add usage tracking and performance metrics
5. **Integration**: Connect with existing compliance workflows
