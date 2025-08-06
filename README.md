# MPU Focus - Enhanced Verification System

## Overview
A comprehensive verification and learning platform with document preview, digital signatures, and email notifications. **Recently upgraded to UploadThing v7** for improved performance and reliability.

## 📋 Table of Contents
- [Features](#features)
- [Document 404 Error Fix](#document-404-error-fix)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Verification System
- **Document Upload & Storage**: Secure document uploads via UploadThing v7
- **Document Preview**: In-browser PDF and image viewing with zoom controls
- **Digital Signatures**: Canvas-based signature capture for legal binding
- **Email Notifications**: Automated approval/rejection notifications
- **Resubmission Flow**: Allow document re-upload without contract re-signing
- **Admin Dashboard**: Comprehensive verification management interface

### 🔧 Document 404 Error Fix

#### Problem Solved
The system now automatically resolves "Document proxy error: Error: Failed to fetch file: 404" issues that occur when document URLs become inaccessible. **This was a key driver for migrating to UploadThing v7.**

#### Root Causes Addressed
1. **Filename Mismatch**: UploadThing sometimes modifies filenames during upload
2. **Missing URL Storage**: Legacy documents uploaded before URL storage implementation  
3. **File Deletion**: Documents removed from UploadThing storage

#### Solution Features
- **Automatic Detection**: Scans all documents and identifies broken URLs
- **Auto-Fix Capability**: Updates database with working URLs when possible
- **Comprehensive Reporting**: Shows which documents are missing vs. fixed
- **Admin Tools**: One-click verification and repair system

#### Document Verifier Tool
The admin panel now includes a **Document Verifier** tool that:

1. **Verifies All Documents**: Tests accessibility of every uploaded document
2. **Auto-Fixes URLs**: Updates database with correct URLs when found
3. **Reports Missing Files**: Lists documents that need user re-upload
4. **Visual Dashboard**: Shows verification status with clear metrics

**How to Use:**
1. Go to Admin Panel → Verification Management
2. Click on "Document Tools" tab
3. Click "Verify All Documents"
4. Review results and take action on missing documents

#### API Endpoints for 404 Resolution

**Document Verification API:**
```bash
# Verify all documents (Admin only)
POST /api/admin/documents/verify

# Check specific user's document
GET /api/admin/documents/verify?userId=USER_ID
```

**Document Proxy API:**
```bash
# Access document through CORS-friendly proxy  
GET /api/documents/proxy?url=ENCODED_UPLOADTHING_URL
```

#### Prevention Measures
- **Enhanced Upload Process**: Stores both filename and full URL
- **Upload Validation**: Verifies file accessibility after upload
- **Better Error Handling**: Graceful degradation when files are missing
- **Comprehensive Logging**: Detailed error tracking for debugging

### User Experience Enhancements
- **Smart Status Management**: Clear indication of verification progress
- **Helpful Error Messages**: Actionable guidance when documents fail to load
- **Resubmission Notices**: Clear instructions for users who need to re-upload

## 🚀 Installation

```bash
# Clone repository
git clone <repository-url>
cd mpu-focus

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run development server
npm run dev
```

## ⚙️ Configuration

### Required Environment Variables

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# Authentication
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000

# File Upload (UploadThing v7)
UPLOADTHING_TOKEN=your_uploadthing_v7_token

# Email Service (for notifications)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM=your_from_email
```

### UploadThing v7 Migration Note

**Important**: We've updated to UploadThing v7 which uses a single `UPLOADTHING_TOKEN` instead of separate `UPLOADTHING_SECRET` and `UPLOADTHING_APP_ID` variables.

To get your v7 token:
1. Go to your [UploadThing Dashboard](https://uploadthing.com/dashboard)
2. Navigate to "API Keys" 
3. Select the "V7" tab
4. Copy your token and set it as `UPLOADTHING_TOKEN`

## 📖 Usage Guide

### For Users

#### Document Upload Process
1. Access verification link from email
2. Upload passport/ID document (PDF or image)
3. Preview document before submission
4. Sign contract (digital signature or checkbox)
5. Wait for admin approval

#### Resubmission Process
1. Receive rejection email with resubmission link
2. Upload new document (contract signature preserved)
3. Wait for re-review

### For Administrators

#### Verification Management
1. Go to Admin Panel → Verification Management
2. Use filters to find specific users or statuses
3. Click "Review" to examine documents and contracts
4. Approve or reject with optional resubmission allowance

#### Document Troubleshooting
1. Go to "Document Tools" tab in Verification Management
2. Run "Verify All Documents" to check all files
3. Review results:
   - **Verified**: Documents are accessible
   - **Fixed**: URLs were corrected automatically
   - **Missing**: Documents need user re-upload
4. Set affected users to resubmission status if needed

#### Handling Missing Documents
When documents are missing:
1. Use Document Verifier to identify affected users
2. Set users to `resubmission_required` status
3. System sends automatic resubmission emails
4. Users can upload new documents without re-signing contracts

## 🔧 API Documentation

### Admin Document Verification

#### Verify All Documents
```http
POST /api/admin/documents/verify
Authorization: Bearer <admin-session>

Response:
{
  "success": true,
  "results": {
    "total": 50,
    "verified": 45,
    "fixed": 3,
    "missing": 2,
    "errors": [...]
  }
}
```

#### Check Specific Document
```http
GET /api/admin/documents/verify?userId=USER_ID
Authorization: Bearer <admin-session>

Response:
{
  "success": true,
  "document": {
    "filename": "passport.pdf",
    "currentUrl": "https://utfs.io/f/abc123",
    "uploadedAt": "2024-01-01T00:00:00Z"
  },
  "testResults": [...]
}
```

### Document Proxy

#### Access Document via Proxy
```http
GET /api/documents/proxy?url=ENCODED_URL

Response: Binary file data with CORS headers
Headers:
- Access-Control-Allow-Origin: *
- Content-Type: application/pdf|image/*
- Content-Disposition: inline
```

## 🐛 Troubleshooting

### Common Issues

#### "Document proxy error: Failed to fetch file: 404"
**Solution**: Use the Document Verifier tool in admin panel
1. Go to Admin → Verification Management → Document Tools
2. Click "Verify All Documents"
3. System will auto-fix URLs where possible
4. For missing files, set users to resubmission status

#### Documents not displaying in admin panel
**Check**: 
1. Document URLs in database
2. UploadThing file accessibility
3. CORS proxy configuration
4. Browser console for specific errors

#### Users can't upload documents
**Check**:
1. UploadThing configuration
2. File size limits
3. Supported file types (PDF, JPG, PNG, WEBP)
4. Network connectivity

### Performance Optimization

#### For Large Document Sets
- Document Verifier processes in batches
- Use pagination in admin panel
- Monitor UploadThing bandwidth usage
- Implement caching for frequently accessed documents

### Browser Compatibility
- **Chrome**: Full support ✅
- **Firefox**: Full support ✅  
- **Safari**: Full support ✅
- **Edge**: Full support ✅
- **Mobile**: Responsive design ✅

## 🔒 Security Features

- **Admin-only APIs**: Document verification requires admin authentication
- **CORS Protection**: Proxy validates UploadThing domains only
- **Secure File Access**: URLs are proxied through authenticated endpoints
- **Audit Trail**: Comprehensive logging of document access and modifications

## 📈 Monitoring

### Key Metrics to Track
- Document verification success rate
- Missing document count
- Resubmission frequency
- Error rates in proxy endpoint
- User completion rates

### Health Checks
The system provides:
- Document accessibility monitoring
- Automatic URL validation
- Error rate tracking
- Performance metrics

## 🛠️ Future Enhancements

### Planned Features
- **Automated Health Monitoring**: Daily document accessibility checks
- **Bulk Operations**: Mass user status updates
- **Advanced Analytics**: Verification completion analytics
- **Document Versioning**: Track document resubmission history
- **Integration APIs**: Third-party verification services

### Scalability Considerations
- **CDN Integration**: Faster global document access
- **Database Optimization**: Indexing for large user bases
- **Background Processing**: Async document verification
- **Microservices**: Separate document service

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request

## 📞 Support

For technical issues:
1. Check troubleshooting guide
2. Review error logs
3. Use Document Verifier tool for 404 errors
4. Contact support with specific error details

---

**Latest Update**: Added comprehensive 404 document error resolution system with automatic detection, repair, and admin tools for managing document accessibility issues.