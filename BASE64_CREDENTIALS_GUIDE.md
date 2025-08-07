# Google Cloud Base64 Credentials Setup Guide

## 🔐 Why Base64 Encoding?

Using base64 encoded credentials is the **recommended approach** for serverless deployments because:
- ✅ **No file uploads needed** - works with environment variables
- ✅ **Secure** - credentials stored as environment variables  
- ✅ **Serverless friendly** - perfect for Vercel, Netlify, etc.
- ✅ **Easy management** - single environment variable

## 📋 Step-by-Step Setup

### 1. Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Go to **IAM & Admin** → **Service Accounts**
4. Click **"Create Service Account"**
5. Fill in details:
   - **Name**: `document-processor`
   - **Description**: `Service account for document processing`
6. Click **"Create and Continue"**
7. Add roles:
   - `Cloud Vision API Service Agent`
   - Or just `Editor` for simplicity
8. Click **"Done"**

### 2. Generate JSON Key

1. Click on your newly created service account
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Choose **"JSON"** format
5. Click **"Create"**
6. **Save the downloaded JSON file securely!**

### 3. Convert JSON to Base64

#### On macOS/Linux:
```bash
base64 -i path/to/your-service-account.json
```

#### On Windows:
```cmd
certutil -encode path/to/your-service-account.json temp.txt
findstr /v /c:- temp.txt > base64_output.txt
type base64_output.txt
```

#### Using Node.js (any platform):
```javascript
const fs = require('fs');
const json = fs.readFileSync('path/to/your-service-account.json');
const base64 = Buffer.from(json).toString('base64');
console.log(base64);
```

#### Online Tool (use carefully):
- Go to [base64encode.org](https://www.base64encode.org/)
- Upload your JSON file
- Copy the output

### 4. Set Environment Variable

#### For Local Development (.env.local):
```env
GOOGLE_CREDENTIALS_BASE64=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InlvdXItcHJvamVjdC0xMjM0NTYiLCJwcml2YXRlX2tleV9pZCI6IjEyMzQ1Njc4OTBhYmNkZWYiLCJwcml2YXRlX2tleSI6Ii0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZnSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2d3Z2dTa0FnRUFBb0lCQVFEQy4uLlxuLS0tLS1FTkQgUFJJVkFURSBLRVktLS0tLVxuIiwiY2xpZW50X2VtYWlsIjoieW91ci1zZXJ2aWNlLWFjY291bnRAeW91ci1wcm9qZWN0LjEyMzQ1Ni5pYW1nc2VydmljZWFjY291bnQuY29tIiwiY2xpZW50X2lkIjoiMTIzNDU2Nzg5MDEyMzQ1Njc4OTAiLCJhdXRoX3VyaSI6Imh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwidG9rZW5fdXJpIjoiaHR0cHM6Ly9vYXV0aDIuZ29vZ2xlYXBpcy5jb20vdG9rZW4iLCJhdXRoX3Byb3ZpZGVyX3g1MDlfY2VydF91cmwiOiJodHRwczovL3d3dy5nb29nbGVhcGlzLmNvbS9vYXV0aDIvdjEvY2VydHMiLCJjbGllbnRfeDUwOV9jZXJ0X3VybCI6Imh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkveW91ci1zZXJ2aWNlLWFjY291bnQlNDB5b3VyLXByb2plY3QuMTIzNDU2LmlhbWdzZXJ2aWNlYWNjb3VudC5jb20ifQ==
```

#### For Vercel:
1. Go to your Vercel dashboard
2. Navigate to your project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `GOOGLE_CREDENTIALS_BASE64`
   - **Value**: Your base64 string (paste the entire string)
   - **Environment**: Production, Preview, Development

#### For Other Platforms:
- **Netlify**: Site settings → Environment variables
- **Railway**: Variables tab in your project
- **Heroku**: Settings → Config Vars

## 🔍 Verification

### Test Your Setup

Create a test script to verify your credentials:

```javascript
// test-credentials.js
const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8')
);

console.log('Project ID:', credentials.project_id);
console.log('Client Email:', credentials.client_email);
console.log('Credentials are valid!');
```

Run with:
```bash
node test-credentials.js
```

### Troubleshooting

#### Error: "Invalid base64 credentials format"
- Check that your base64 string doesn't have line breaks
- Ensure you copied the complete string
- Try re-encoding the JSON file

#### Error: "Missing required field 'project_id'"
- Your JSON file might be corrupted
- Re-download the service account JSON
- Verify the JSON structure

#### Error: "Credentials must be for a service account"
- Make sure you downloaded a service account key, not user credentials
- The JSON should have `"type": "service_account"`

## 🔒 Security Best Practices

### Do:
- ✅ Store credentials as environment variables
- ✅ Use different service accounts for different environments
- ✅ Regularly rotate service account keys
- ✅ Use minimal required permissions

### Don't:
- ❌ Commit credentials to version control
- ❌ Share credentials in plain text
- ❌ Use overly broad permissions
- ❌ Store credentials in client-side code

## 📝 Example Environment Setup

### Complete .env.local Example:
```env
# Required for document processing
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_CREDENTIALS_BASE64=your-very-long-base64-string-here

# Other app variables
NEXTAUTH_SECRET=your-nextauth-secret
MONGODB_URI=mongodb://localhost:27017/mpu-focus
```

### Vercel Environment Variables:
```
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_CREDENTIALS_BASE64=your-very-long-base64-string-here
NEXTAUTH_SECRET=your-nextauth-secret
MONGODB_URI=your-mongodb-connection-string
```

## 🚀 Ready to Use!

Once you've set up the `GOOGLE_CREDENTIALS_BASE64` environment variable, your document processor will automatically:

1. **Parse the credentials** from the base64 string
2. **Validate** the credential format
3. **Connect** to Google Cloud Vision API
4. **Process** your documents with OCR

No additional configuration needed! 🎉

---

**Note**: Keep your service account JSON file secure and never share it. The base64 encoding is just for transport - the underlying data is still sensitive.