# CORS Fix for Document Preview and Download

## Problem Description

The application was encountering CORS (Cross-Origin Resource Sharing) errors when trying to access documents stored on UploadThing's CDN (`utfs.io`). This manifested as:

```
Access to fetch at 'https://utfs.io/f/filename.png' from origin 'https://your-domain.vercel.app' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause

UploadThing's CDN (`utfs.io`) doesn't include the necessary CORS headers to allow direct browser access from external domains. When the browser tries to fetch the document for preview or download, it's blocked by the browser's same-origin policy.

## Solution Implemented

### 1. Document Proxy API

Created a server-side proxy endpoint at `/api/documents/proxy` that:

- **Fetches documents server-side**: The Next.js server fetches from UploadThing (no CORS restrictions)
- **Adds proper CORS headers**: Returns the document with appropriate headers
- **Validates sources**: Only allows requests to UploadThing domains for security
- **Caches responses**: Implements caching for better performance

**File**: `/src/app/api/documents/proxy/route.ts`

```typescript
// Proxy endpoint that fetches documents and adds CORS headers
export async function GET(request: NextRequest) {
  const fileUrl = searchParams.get('url') // Original UploadThing URL
  
  // Security: Validate URL is from UploadThing
  const allowedDomains = ['utfs.io', 'uploadthing.com']
  
  // Fetch from UploadThing server-side (no CORS)
  const response = await fetch(fileUrl)
  
  // Return with proper CORS headers
  return new NextResponse(fileBuffer, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': originalContentType,
      'Cache-Control': 'public, max-age=31536000'
    }
  })
}
```

### 2. URL Transformation

Updated all document retrieval points to use proxied URLs:

**Before (Direct UploadThing URL):**
```
https://utfs.io/f/filename.png
```

**After (Proxied URL):**
```
/api/documents/proxy?url=https%3A//utfs.io/f/filename.png
```

### 3. Updated Components

**Document Retrieval API** (`/api/verification/document/[token]`):
- Returns proxied URLs instead of direct UploadThing URLs
- Maintains backward compatibility with legacy documents

**Admin Interface** (`VerificationManagement.tsx`):
- Uses proxied URLs for document preview
- Handles both new and legacy document URLs

**Document Preview Component** (`document-preview.tsx`):
- Enhanced download function to work with proxied responses
- Improved error handling for fetch failures

## Implementation Details

### Security Measures

1. **Domain Validation**: Only allows URLs from trusted UploadThing domains
2. **URL Encoding**: Properly encodes URLs to prevent injection attacks
3. **Error Handling**: Comprehensive error handling with appropriate status codes

### Performance Optimizations

1. **Caching**: Documents cached for 1 year (static files don't change)
2. **Streaming**: Uses ArrayBuffer for efficient memory usage
3. **Content-Type Preservation**: Maintains original file MIME types

### Browser Compatibility

The proxy solution works across all modern browsers because:
- Server-side fetching has no CORS restrictions
- Standard HTTP responses work in all browsers
- Proper content-type headers ensure correct rendering

## File Flow Diagram

```mermaid
graph TD
    A[User Browser] --> B[Document Preview Component]
    B --> C[/api/documents/proxy]
    C --> D[UploadThing CDN]
    D --> E[Document File]
    E --> C
    C --> F[Add CORS Headers]
    F --> B
    B --> G[Display/Download Document]
```

## Code Changes Summary

### 1. New Files Created
- `/src/app/api/documents/proxy/route.ts` - Main proxy endpoint

### 2. Files Modified
- `/src/app/api/verification/document/[token]/route.ts` - Return proxied URLs
- `/src/components/admin/VerificationManagement.tsx` - Use proxied URLs in admin
- `/src/components/ui/document-preview.tsx` - Enhanced download handling

### 3. URL Pattern Changes

**Document API Response (Before):**
```json
{
  "document": {
    "url": "https://utfs.io/f/filename.png"
  }
}
```

**Document API Response (After):**
```json
{
  "document": {
    "url": "/api/documents/proxy?url=https%3A//utfs.io/f/filename.png",
    "originalUrl": "https://utfs.io/f/filename.png"
  }
}
```

## Testing the Fix

### 1. Verify Proxy Endpoint
```bash
curl "https://your-domain.com/api/documents/proxy?url=https%3A//utfs.io/f/test-file.png"
```

### 2. Check CORS Headers
```javascript
fetch('/api/documents/proxy?url=https%3A//utfs.io/f/test-file.png')
  .then(response => {
    console.log('CORS headers:', response.headers.get('Access-Control-Allow-Origin'))
    return response.blob()
  })
  .then(blob => console.log('File downloaded successfully'))
```

### 3. Test Document Preview
1. Upload a document through the verification flow
2. View the document in admin panel
3. Verify download functionality works
4. Check browser console for CORS errors (should be none)

## Benefits of This Solution

### ✅ Advantages
- **Eliminates CORS errors**: All document access now works
- **Security maintained**: Domain validation prevents abuse
- **Performance optimized**: Caching reduces server load
- **Backward compatible**: Works with existing documents
- **Browser universal**: Works in all modern browsers

### 🔄 Alternative Solutions Considered

1. **UploadThing CORS configuration**: Not available/configurable
2. **Client-side workarounds**: Would compromise security
3. **Direct database storage**: Would require significant refactoring
4. **External CDN**: Would require migration of existing files

## Monitoring and Maintenance

### Logs to Monitor
- Proxy endpoint usage and performance
- Failed document fetches from UploadThing
- Invalid URL attempts (security)

### Potential Issues and Solutions

**Issue**: High server load from document proxying
**Solution**: Implement CDN caching or edge functions

**Issue**: UploadThing URL pattern changes
**Solution**: Update URL construction logic

**Issue**: Large files causing timeouts
**Solution**: Implement streaming responses for large files

## Environment Considerations

### Development
- Proxy works locally and in development environments
- No additional configuration required

### Production
- Vercel Edge Functions handle the proxy efficiently
- Automatic scaling based on usage
- Built-in caching at edge locations

### Security in Production
- Rate limiting (can be added if needed)
- Access logging for audit trails
- URL validation prevents external abuse

This proxy solution completely resolves the CORS issues while maintaining security, performance, and user experience.