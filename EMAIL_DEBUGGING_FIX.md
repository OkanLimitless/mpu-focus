# Email Debugging & SMTP Configuration Fix

## Problem Solved

The issue was that rejection emails with resubmission were failing with "SMTP credentials not configured" even though approval emails worked fine. This was happening because:

1. **Misleading Error Messages**: The API returned "notification email sent" even when emails failed
2. **Limited Debugging Info**: No way to see what specific SMTP settings were missing
3. **Silent Failures**: Errors were caught but not properly reported to the admin

## ✅ **Comprehensive Fix Applied**

### 1. **Enhanced SMTP Credential Checking**

**Before:**
```javascript
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.warn('SMTP credentials not configured, skipping email notification')
  return false
}
```

**After:**
```javascript
function checkSMTPCredentials(): { configured: boolean; missing: string[] } {
  const missing = []
  
  if (!process.env.SMTP_USER) missing.push('SMTP_USER')
  if (!process.env.SMTP_PASS) missing.push('SMTP_PASS')
  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST')
  
  return {
    configured: missing.length === 0,
    missing
  }
}
```

### 2. **Detailed Error Reporting**

**API Response Now Includes:**
```json
{
  "success": true,
  "message": "User verification requires resubmission but email notification failed",
  "emailSent": false,
  "emailConfigured": true,
  "emailError": "Invalid login: 535 Authentication failed",
  "user": { ... }
}
```

### 3. **Comprehensive Logging**

**Email Service Now Logs:**
- SMTP transporter configuration (with masked credentials)
- Detailed credential checking results
- Email sending attempts with full context
- Specific error messages with stack traces

**Example Log Output:**
```
Creating transporter with config: {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  user: '***mail.com',
  pass: '***fured***'
}

Attempting to send rejection email... {
  email: 'user@example.com',
  allowResubmission: true,
  rejectionReason: 'Document quality is too low...'
}

Sending rejection email with options: {
  from: '"MPU-Focus Verification Team" <noreply@yourapp.com>',
  to: 'user@example.com',
  subject: 'Document Verification Update - Resubmission Required',
  htmlLength: 1234,
  textLength: 567
}

Verification rejected email sent successfully: <message-id>
```

### 4. **New Test Email Endpoint**

Created `/api/admin/test-email` to help diagnose SMTP issues:

**Check Configuration:**
```bash
POST /api/admin/test-email
{
  "action": "check"
}
```

**Test Connection:**
```bash
POST /api/admin/test-email
{
  "action": "test"
}
```

**Send Test Email:**
```bash
POST /api/admin/test-email
{
  "action": "test",
  "testEmail": "admin@yourapp.com"
}
```

## 🔍 **Troubleshooting Guide**

### Step 1: Check Environment Variables

Ensure all required SMTP environment variables are set:

```env
# Required
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional
SMTP_PORT=587
SMTP_FROM=noreply@yourapp.com
```

### Step 2: Test SMTP Configuration

Use the new test endpoint to verify configuration:

```javascript
// In browser console or API client
fetch('/api/admin/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'check' })
})
.then(res => res.json())
.then(console.log)
```

### Step 3: Send Test Email

```javascript
fetch('/api/admin/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'test',
    testEmail: 'your-admin@email.com'
  })
})
.then(res => res.json())
.then(console.log)
```

### Step 4: Check Server Logs

Look for specific error patterns:

**Missing Credentials:**
```
SMTP configuration incomplete: {
  SMTP_USER: true,
  SMTP_PASS: false,
  SMTP_HOST: true,
  SMTP_FROM: true
}
```

**Authentication Issues:**
```
Error sending verification rejected email: {
  error: "Invalid login: 535-5.7.8 Username and Password not accepted",
  user: "user@example.com",
  allowResubmission: true
}
```

**Connection Issues:**
```
Error sending verification rejected email: {
  error: "connect ECONNREFUSED 74.125.24.108:587",
  user: "user@example.com"
}
```

## 🎯 **Common Issues & Solutions**

### Issue 1: "Authentication failed" with Gmail
**Cause**: Using regular password instead of App Password
**Solution**: 
1. Enable 2FA on your Gmail account
2. Generate an App Password
3. Use the App Password as `SMTP_PASS`

### Issue 2: "Connection refused"
**Cause**: Wrong SMTP host or port
**Solution**: Verify SMTP settings for your email provider
- Gmail: `smtp.gmail.com:587`
- Outlook: `smtp-mail.outlook.com:587`
- Yahoo: `smtp.mail.yahoo.com:587`

### Issue 3: Emails work sometimes but not others
**Cause**: Rate limiting or temporary connection issues
**Solution**: 
1. Add retry logic
2. Check rate limits with your email provider
3. Use dedicated email service (SendGrid, Mailgun, etc.)

### Issue 4: "SMTP credentials not configured" but they are set
**Cause**: Environment variables not loaded in production
**Solution**:
1. Verify environment variables in deployment platform
2. Check for typos in variable names
3. Restart application after setting variables

## 📊 **Monitoring & Alerts**

The enhanced logging now provides:

1. **Real-time Status**: Know immediately if emails fail
2. **Detailed Context**: See exactly what failed and why
3. **Configuration Validation**: Verify SMTP setup before sending
4. **Performance Tracking**: Monitor email sending success rates

## 🚀 **Next Steps**

1. **Test the new system**: Try rejecting a verification with resubmission
2. **Check logs**: Monitor server logs for detailed email debugging info
3. **Use test endpoint**: Verify SMTP configuration is working
4. **Set up monitoring**: Watch for email failures in production

---

**The rejection emails with resubmission should now work properly with detailed error reporting and debugging capabilities!** 📧✅