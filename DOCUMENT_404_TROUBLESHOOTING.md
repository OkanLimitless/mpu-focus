# Document 404 Error Troubleshooting Guide

## Problem Description

Users encountering "Document proxy error: Error: Failed to fetch file: 404" when trying to view uploaded documents. This indicates that the document file cannot be found at the expected UploadThing URL.

## Root Causes

### 1. Filename Mismatch
- **Issue**: The filename stored in the database doesn't match the actual file key in UploadThing
- **Cause**: UploadThing sometimes modifies filenames during upload (special characters, encoding, etc.)
- **Example**: 
  - Stored: `ChatGPT_Image_5_aug_2025__18_56_50-removebg-preview.png`
  - Actual: `ChatGPT_Image_5_aug_2025_18_56_50-removebg-preview.png` (underscores changed)

### 2. Missing URL Storage
- **Issue**: Legacy documents uploaded before URL storage implementation
- **Cause**: Earlier versions didn't store the full UploadThing URL
- **Impact**: System tries to construct URL from filename, which may be incorrect

### 3. File Deletion
- **Issue**: Files were deleted from UploadThing storage
- **Cause**: Manual deletion, UploadThing cleanup, or storage issues
- **Impact**: Valid URLs pointing to non-existent files

## Diagnostic Steps

### Step 1: Check Document in Admin Panel

1. Go to admin verification management
2. Find the user with the document issue
3. Try to preview the document
4. Check browser console for detailed error messages

### Step 2: Use Document Verification Tool

1. Access the admin panel
2. Run the Document URL Verifier (if implemented)
3. Review the verification results
4. Check which documents are missing vs fixed

### Step 3: Manual URL Testing

Test URLs manually in browser:

```bash
# Test direct UploadThing URL
https://utfs.io/f/[filename]

# Test through proxy
https://your-domain.com/api/documents/proxy?url=https%3A//utfs.io/f/[filename]
```

### Step 4: Database Inspection

Check the database for document information:

```javascript
// MongoDB query to find documents with issues
db.users.find({
  "passportDocument.filename": { $exists: true }
}, {
  "email": 1,
  "passportDocument.filename": 1,
  "passportDocument.url": 1
})
```

## Solutions

### Solution 1: Automatic URL Verification and Fixing

**What it does**: Checks all documents and updates broken URLs

**Implementation**: Use the Document Verification API

```javascript
// POST /api/admin/documents/verify
// This will:
// 1. Find all users with documents
// 2. Test current URLs
// 3. Try alternative URL constructions
// 4. Update database with working URLs
// 5. Report missing documents
```

**Usage**:
1. Go to admin panel
2. Use the Document Verifier component
3. Click "Verify All Documents"
4. Review results and missing documents

### Solution 2: Manual URL Correction

For specific documents that can't be auto-fixed:

1. **Find the actual file in UploadThing**:
   - Log into UploadThing dashboard
   - Search for files by date/user
   - Note the correct file key

2. **Update database manually**:
   ```javascript
   db.users.updateOne(
     { "passportDocument.filename": "old-filename.png" },
     { $set: { "passportDocument.url": "https://utfs.io/f/correct-file-key" } }
   )
   ```

### Solution 3: Re-upload Request

For completely missing files:

1. **Set user status to resubmission_required**:
   ```javascript
   db.users.updateOne(
     { "_id": ObjectId("user-id") },
     { 
       $set: { 
         "verificationStatus": "resubmission_required",
         "passportDocument.allowResubmission": true
       }
     }
   )
   ```

2. **Notify user to re-upload**:
   - Send resubmission email
   - User uploads new document
   - System stores correct URL

## Prevention Measures

### 1. Enhanced Upload Process

**Store complete URL immediately**:
```javascript
// In upload API
const uploadResult = await utapi.uploadFiles([document])
const uploadedFile = uploadResult[0].data

// Store both filename AND full URL
user.passportDocument = {
  filename: uploadedFile.name,
  url: uploadedFile.url,  // Store complete URL
  uploadedAt: new Date(),
  status: 'pending'
}
```

### 2. Upload Validation

**Verify file accessibility after upload**:
```javascript
// After storing in database, verify file is accessible
const testResponse = await fetch(uploadedFile.url, { method: 'HEAD' })
if (!testResponse.ok) {
  throw new Error('Uploaded file is not accessible')
}
```

### 3. Regular Health Checks

**Implement periodic document verification**:
- Daily/weekly automated checks
- Email alerts for broken documents
- Automatic cleanup of invalid entries

## Emergency Recovery Steps

### If Multiple Documents Are Affected:

1. **Run Document Verification**:
   ```bash
   POST /api/admin/documents/verify
   ```

2. **Review Results**:
   - Check how many were auto-fixed
   - Identify patterns in missing files
   - List users affected

3. **Bulk Resubmission**:
   For users with missing documents:
   ```javascript
   // Set all affected users to resubmission status
   db.users.updateMany(
     { "_id": { $in: [list_of_affected_user_ids] } },
     { 
       $set: { 
         "verificationStatus": "resubmission_required",
         "passportDocument.allowResubmission": true
       }
     }
   )
   ```

4. **Notify Affected Users**:
   - Send bulk resubmission emails
   - Provide clear instructions
   - Offer support contact

### If UploadThing Service is Down:

1. **Implement Graceful Degradation**:
   ```javascript
   // In document preview component
   if (error && error.includes('Failed to fetch')) {
     return <ServiceUnavailableMessage />
   }
   ```

2. **Queue Retry Mechanism**:
   - Store failed requests
   - Retry when service is restored
   - Notify users when available

## Monitoring and Alerts

### Set Up Document Health Monitoring:

1. **Daily Health Check**:
   ```javascript
   // Cron job to check random sample of documents
   const sampleDocuments = await User.aggregate([
     { $match: { "passportDocument.url": { $exists: true } } },
     { $sample: { size: 10 } }
   ])
   
   for (const user of sampleDocuments) {
     const response = await fetch(user.passportDocument.url, { method: 'HEAD' })
     if (!response.ok) {
       // Send alert email
     }
   }
   ```

2. **Error Rate Monitoring**:
   - Track 404 errors in proxy endpoint
   - Alert if error rate exceeds threshold
   - Monitor UploadThing service status

### Log Analysis:

Monitor these log patterns:
- `Document proxy error: Error: Failed to fetch file: 404`
- `Failed to fetch file from UploadThing`
- `Document not found` errors

## Testing Verification

### After Implementing Fixes:

1. **Test Document Preview**:
   - Try viewing documents in admin panel
   - Test download functionality
   - Verify no CORS errors

2. **Test New Uploads**:
   - Upload new document
   - Verify URL is stored correctly
   - Test immediate accessibility

3. **Test Resubmission Flow**:
   - Set user to resubmission status
   - Upload new document
   - Verify old contract signature preserved

## API Endpoints for Troubleshooting

### Document Verification API:
```bash
# Verify all documents
POST /api/admin/documents/verify

# Check specific user's document
GET /api/admin/documents/verify?userId=USER_ID
```

### Document Proxy API:
```bash
# Access document through proxy
GET /api/documents/proxy?url=ENCODED_UPLOADTHING_URL
```

### Response Examples:

**Successful verification**:
```json
{
  "success": true,
  "results": {
    "total": 10,
    "verified": 8,
    "fixed": 1,
    "missing": 1,
    "errors": [...]
  }
}
```

**Document not found**:
```json
{
  "error": "Document not found",
  "details": "The requested document no longer exists or the URL is incorrect",
  "url": "https://utfs.io/f/missing-file.png"
}
```

This comprehensive approach should resolve most document 404 issues while preventing future occurrences.