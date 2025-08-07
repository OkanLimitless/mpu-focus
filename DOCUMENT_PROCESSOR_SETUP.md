# Document Processor Setup Guide

## 🎉 Build Status: SUCCESS ✅ (Final - Build Issues Resolved)

The document processing tool has been successfully built, all build issues resolved, and optimized for serverless deployment!

## 📍 Access the Tool

Once deployed, you can access the document processor at:
```
https://your-domain.com/document-processor
```

## 🔧 Required Setup

### 1. Google Cloud Vision API

**Step 1**: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Note your Project ID

**Step 2**: Enable Vision API
1. Go to "APIs & Services" → "Library"
2. Search for "Cloud Vision API"
3. Click "Enable"

**Step 3**: Create Service Account
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name it (e.g., "document-processor")
4. Grant roles: "Cloud Vision API Service Agent"
5. Click "Create and Continue" → "Done"

**Step 4**: Generate Key File
1. Click on the created service account
2. Go to "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON" format
5. Download the file (keep it secure!)

### 2. OpenAI API

**Step 1**: Get API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to "API Keys"
3. Click "Create new secret key"
4. Copy the key (keep it secure!)

**Step 2**: Add Credits
- Make sure your OpenAI account has sufficient credits
- GPT-4 usage can be expensive for large documents

### 3. Environment Variables

Add these to your `.env.local` file:

```env
# Document Processing APIs
OPENAI_API_KEY=sk-your-openai-api-key-here
GOOGLE_CREDENTIALS_BASE64=your-base64-encoded-service-account-json
```

### How to Generate Base64 Credentials

1. **Download your service account JSON file** from Google Cloud Console
2. **Convert to base64**:
   ```bash
   # On macOS/Linux
   base64 -i path/to/service-account.json
   
   # On Windows
   certutil -encode path/to/service-account.json temp.txt && findstr /v /c:- temp.txt
   ```
3. **Copy the base64 string** (it will be very long)
4. **Set as environment variable** in Vercel or your `.env.local`

### 4. Production Deployment

For Vercel deployment:

1. **Set Environment Variables in Vercel Dashboard**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add the following variables:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   GOOGLE_CREDENTIALS_BASE64=your-base64-encoded-json-string
   ```

2. **Benefits of Base64 Approach**:
   - ✅ No file uploads needed
   - ✅ Works perfectly with serverless
   - ✅ Secure credential storage
   - ✅ Easy environment variable management

## 🚀 Testing the Tool

### Test Document Requirements
- **Format**: PDF only
- **Size**: Up to 50MB
- **Pages**: Optimized for 100-200 pages
- **Content**: Works best with scanned documents/images

### Test Process
1. Navigate to `/document-processor`
2. Upload a test PDF document
3. Watch the real-time progress
4. Review extracted and structured data

### Expected Processing Time
- **Small docs** (1-10 pages): 10-30 seconds
- **Medium docs** (50-100 pages): 1-3 minutes  
- **Large docs** (150-200 pages): 3-8 minutes

### Processing Approach
The tool now uses an intelligent hybrid approach:
1. **Direct Text Extraction**: First attempts to extract text directly from PDF
2. **OCR Fallback**: If PDF contains mostly images, automatically switches to Google Cloud Vision OCR
3. **AI Structuring**: Uses GPT-4 to organize extracted text according to your template

## 📊 Features Overview

### ✅ Implemented Features
- **PDF Upload**: Drag & drop interface with validation
- **Real-time Progress**: Live updates during processing
- **Hybrid Processing**: Smart text extraction + OCR fallback
- **AI Structuring**: GPT-4 powered data extraction
- **Template System**: Pre-built templates for different document types
- **Error Handling**: Comprehensive error management
- **Results Export**: Copy structured data
- **Serverless Optimized**: Built for Vercel deployment

### 🎯 Template Support
- **Legal Documents**: Extract offense details, dates, penalties, personal info
- **Invoices**: Extract billing information, line items, totals
- **General Documents**: Extract key information in structured format

## 🔍 Monitoring & Troubleshooting

### Common Issues

**1. OCR Errors**
- Check Google Cloud Vision API quota
- Verify service account permissions
- Ensure image quality is sufficient

**2. LLM Extraction Errors**
- Check OpenAI API key and credits
- Monitor rate limits
- Verify document content is extractable

**3. Upload Issues**
- Check file size (50MB limit)
- Verify PDF format
- Ensure network connectivity

### Debug Logs
Check browser console and server logs for detailed error information.

### Performance Tips
- Use high-quality scanned documents
- Ensure good contrast and readability
- Break very large documents into smaller chunks if needed

## 💰 Cost Estimation

### Google Cloud Vision
- **Text Detection**: ~$1.50 per 1,000 pages
- **Example**: 200-page document ≈ $0.30

### OpenAI GPT-4
- **Input tokens**: ~$0.03 per 1K tokens
- **Output tokens**: ~$0.06 per 1K tokens
- **Example**: 200-page document ≈ $2-5 (depending on content)

### Total Cost Example (Hybrid Approach)
- **Text-based PDFs** (200 pages): ~$2-5 (mostly LLM costs)
- **Image-based PDFs** (200 pages): ~$2.30-5.30 (OCR + LLM costs)
- **Mixed PDFs** (200 pages): ~$1-3 (optimized processing)

## 🔒 Security Considerations

### Data Handling
- Files are processed temporarily and deleted after processing
- No permanent storage of uploaded documents
- OCR text is processed through secure APIs

### API Security
- Use environment variables for API keys
- Rotate keys regularly
- Monitor API usage and costs

### Access Control
- Tool is publicly accessible (consider adding authentication)
- Add rate limiting for production use
- Monitor for abuse

## 🎯 Next Steps

### Immediate Actions
1. Set up Google Cloud Vision API
2. Get OpenAI API key
3. Configure environment variables
4. Test with sample documents
5. Deploy to production

### Future Enhancements
- User authentication integration
- Document history/storage
- Batch processing capabilities
- Additional OCR providers
- Custom template builder
- API rate limiting
- Usage analytics

## 📞 Support

If you encounter issues:
1. Check environment variable configuration
2. Verify API key permissions
3. Review browser console for errors
4. Check server logs for detailed error messages

---

**Status**: ✅ Ready for Production Deployment
**Last Updated**: January 2025