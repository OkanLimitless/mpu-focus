# UploadThing v7 Migration Guide

## Overview

We've successfully migrated from UploadThing v6.13.3 to v7.7.3 to resolve document accessibility issues and take advantage of the latest features and improved infrastructure.

## 🔧 What Changed

### 1. Environment Variables
**Before (v6):**
```env
UPLOADTHING_SECRET=your_secret_key
UPLOADTHING_APP_ID=your_app_id
```

**After (v7):**
```env
UPLOADTHING_TOKEN=your_v7_token
```

### 2. File URL Patterns
**Before (v6):**
- `https://utfs.io/f/FILE_KEY`

**After (v7):**
- Primary: `https://APP_ID.ufs.sh/f/FILE_KEY`
- Legacy (still supported): `https://utfs.io/f/FILE_KEY`

### 3. API Response Structure
The `uploadFiles` response structure has been improved for better error handling.

## 🚀 Benefits of v7

1. **35% Smaller Bundle Size**: Reduced client-side JavaScript
2. **Faster Uploads**: Re-architected backend with fewer round-trips
3. **Better Error Handling**: More detailed error messages
4. **Resumable Uploads**: Support for pause/resume functionality
5. **Improved Infrastructure**: Modern web advancements and no polling logic

## 📋 Migration Steps Completed

### Step 1: Package Updates
```bash
npm install uploadthing@latest @uploadthing/react@latest
```

### Step 2: Environment Variable Migration
Updated all documentation to reference `UPLOADTHING_TOKEN` instead of the old variables.

### Step 3: API Updates
**Upload Document API (`/api/verification/upload-document`):**
- Updated error handling for v7 response structure
- Improved error messages
- Added WEBP support to allowed file types

**Document Verification API (`/api/admin/documents/verify`):**
- Added support for multiple URL patterns (v7 and legacy)
- Smart URL testing and automatic database updates
- Better error reporting with tested URLs

**Document Retrieval API (`/api/verification/document/[token]`):**
- Intelligent URL pattern detection
- Automatic URL testing and database updates
- Fallback to legacy URLs when needed

**Document Proxy API (`/api/documents/proxy`):**
- Enhanced domain validation for v7 patterns
- Support for `*.ufs.sh` subdomains
- Improved error messages with migration hints

### Step 4: Automatic URL Migration
The system now automatically:
1. **Tests existing URLs** to verify they still work
2. **Tries v7 patterns** if stored URLs fail
3. **Falls back to legacy patterns** for older uploads
4. **Updates the database** with working URLs
5. **Reports missing files** that need re-upload

## 🔍 How URL Migration Works

### Automatic Detection & Repair
```javascript
// The system tries multiple URL patterns:
const urlsToTry = [
  // Current v7 pattern
  `https://app.ufs.sh/f/${filename}`,
  // Legacy pattern  
  `https://utfs.io/f/${filename}`,
  // Alternative patterns
  `https://uploadthing.ufs.sh/f/${filename}`
]

// Tests each URL and updates database with working ones
```

### Document Verifier Tool
The admin panel includes a tool that:
- ✅ **Verifies** all uploaded documents
- 🔧 **Auto-fixes** broken URLs
- 📊 **Reports** missing files
- 🎯 **Updates** database with correct URLs

## 🛠️ For Developers

### Getting Your v7 Token
1. Go to [UploadThing Dashboard](https://uploadthing.com/dashboard)
2. Navigate to "API Keys"
3. Select the "V7" tab
4. Copy your token
5. Set as `UPLOADTHING_TOKEN` environment variable

### Updated Code Patterns

**File Upload (v7):**
```javascript
// UTApi constructor no longer needs parameters
const utapi = new UTApi() // Reads from UPLOADTHING_TOKEN

// Error handling improved
const uploadResult = await utapi.uploadFiles([document])
if (!uploadResult[0] || uploadResult[0].error) {
  throw new Error(uploadResult[0]?.error?.message || 'Upload failed')
}
```

**Domain Validation (v7):**
```javascript
// Support for new URL patterns
const allowedDomains = [
  'utfs.io',           // Legacy
  'uploadthing.com',   // General
  'ufs.sh'            // New v7 pattern (*.ufs.sh)
]

const isValidDomain = allowedDomains.some(domain => 
  hostname === domain || hostname.endsWith('.' + domain)
)
```

## 🔧 Troubleshooting

### If Documents Are Not Loading

1. **Use Document Verifier Tool**:
   - Go to Admin Panel → Verification Management → Document Tools
   - Click "Verify All Documents"
   - Review results and fix URLs automatically

2. **Check Environment Variables**:
   ```bash
   # Make sure you're using the v7 token
   UPLOADTHING_TOKEN=your_v7_token_here
   ```

3. **Manual URL Testing**:
   ```bash
   # Test v7 pattern
   https://YOUR_APP_ID.ufs.sh/f/FILE_KEY
   
   # Test legacy pattern
   https://utfs.io/f/FILE_KEY
   ```

### Common Issues & Solutions

#### Issue: "Document not found" errors
**Solution**: Run the Document Verifier tool to auto-fix URLs

#### Issue: CORS errors
**Solution**: All documents now go through the proxy (`/api/documents/proxy`)

#### Issue: Legacy URLs not working
**Solution**: The system automatically detects and updates to v7 URLs

## 📊 Migration Status

### What's Been Updated
- ✅ Package versions (v6.13.3 → v7.7.3)
- ✅ Environment variables (`UPLOADTHING_TOKEN`)
- ✅ Upload API endpoints
- ✅ Document verification system
- ✅ URL pattern handling
- ✅ Error handling & logging
- ✅ Admin tools for URL fixing
- ✅ Documentation updates

### Backward Compatibility
- ✅ Legacy URLs (`utfs.io`) still supported
- ✅ Existing documents continue to work
- ✅ Automatic migration for existing files
- ✅ No user action required for existing uploads

## 🎯 Expected Improvements

After migration, you should see:

1. **Faster Upload Experience**: Reduced round-trips to UploadThing servers
2. **Better Error Messages**: More specific feedback when uploads fail
3. **Automatic URL Fixing**: No more manual intervention for broken document links
4. **Improved Reliability**: Better infrastructure and error handling
5. **Smaller Bundle Size**: 35% reduction in client-side JavaScript

## 🔍 Monitoring & Verification

### Health Checks
The system now provides:
- **Document accessibility monitoring**
- **Automatic URL validation**
- **Error rate tracking**
- **Performance metrics**

### Admin Tools
- **Document Verifier**: One-click URL verification and repair
- **Detailed Reporting**: Shows which documents need attention
- **Batch Operations**: Fix multiple documents at once

## 📞 Support

If you encounter any issues:

1. **Check the Document Verifier tool** in admin panel
2. **Review error logs** for specific error messages
3. **Verify environment variables** are correctly set
4. **Test URLs manually** using the patterns above

## 🎉 Migration Complete

The UploadThing v7 migration is now complete! The system should be more reliable, faster, and provide better error handling for document uploads and access.

**Key Takeaway**: All existing functionality is preserved while gaining the benefits of v7's improved infrastructure and performance.