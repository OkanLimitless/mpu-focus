# Debugging Guide for Document Processing

## Overview
Added comprehensive logging and debugging capabilities to help identify issues during document processing.

## What Was Fixed

### 1. **Silent Error Handling**
- **Before**: Empty `catch {}` blocks were silently swallowing errors
- **After**: All errors are now logged and sent to the frontend via Server-Sent Events (SSE)

### 2. **Debug Logging System**
- Added `logDebug()` function that sends logs to both:
  - Console (for server-side debugging)
  - Frontend (via SSE for real-time visibility)

### 3. **Frontend Debug Panel**
- Added a collapsible debug log viewer in the document processor UI
- Shows real-time logs with timestamps and log levels
- Auto-expands when errors occur
- Color-coded by log level (info/warn/error)

## How to Use

### Viewing Debug Logs

1. **During Processing**:
   - Start processing a document
   - Look for the "Debug Logs" panel below the processing status
   - Click to expand/collapse
   - Logs update in real-time

2. **Log Levels**:
   - **Info** (blue): Normal operations, progress updates
   - **Warn** (yellow): Non-critical issues, fallbacks
   - **Error** (red): Critical failures, exceptions

3. **What to Look For**:
   - **Pass1 errors**: Issues with initial indexing/clustering
   - **Pass2 cluster failures**: Problems extracting delicts from specific page clusters
   - **Pass3 errors**: Consolidation failures
   - **Pass4 warnings**: Validation skipped (usually non-critical)
   - **Timeout errors**: API calls taking too long
   - **GCS errors**: Google Cloud Storage upload/download issues

### Common Issues & Solutions

#### "Pass1 failed, using fallback clustering"
- **Meaning**: Initial AI indexing failed, using page-based clustering instead
- **Impact**: Usually non-critical, processing continues
- **Action**: Check OpenAI API key and model availability

#### "Cluster X failed"
- **Meaning**: Failed to extract delict from a specific page cluster
- **Impact**: That cluster's data may be missing from final report
- **Action**: Check if pages contain valid German legal text

#### "ai-timeout-XXXXX"
- **Meaning**: AI API call timed out
- **Impact**: Processing step failed
- **Action**: 
  - Check `OCR_LLM_TIMEOUT_MS` environment variable
  - Increase timeout if needed
  - Check OpenAI API status

#### "GCS upload failed"
- **Meaning**: Failed to upload PDF to Google Cloud Storage
- **Impact**: Processing cannot continue
- **Action**: 
  - Check `GCS_INPUT_BUCKET` and `GCS_OUTPUT_BUCKET` environment variables
  - Verify Google Cloud credentials
  - Check bucket permissions

## Environment Variables for Debugging

```bash
# AI Processing Timeouts
OCR_LLM_TIMEOUT_MS=120000  # Milliseconds (default: 120000 = 2 minutes)

# AI Models (if using custom models)
OCR_PASS1_MODEL=gpt-5-nano
OCR_PASS2_MODEL=gpt-5-mini
OCR_PASS3_MODEL=gpt-5-mini
OCR_PASS4_MODEL=gpt-5-nano

# Clustering
OCR_CLUSTER_CONCURRENCY=2  # Parallel cluster processing (1-4)
OCR_MAX_CLUSTER_PAGES=10   # Pages per cluster (6-12)
```

## Server-Side Logs

In addition to the frontend debug panel, check your server logs:

### Development
```bash
npm run dev
# Watch terminal for [VisionOCR] prefixed logs
```

### Production (Vercel)
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Logs" tab
4. Filter for `[VisionOCR]` or `VisionOCR`

## Troubleshooting Steps

1. **Check Debug Logs Panel**: Look for error messages
2. **Check Browser Console**: Open DevTools → Console tab
3. **Check Server Logs**: Look for `[VisionOCR]` prefixed messages
4. **Verify Environment Variables**: Ensure all required vars are set
5. **Test API Connections**: 
   - OpenAI API key valid?
   - Google Cloud credentials valid?
   - UploadThing token valid?

## Example Debug Output

```
[INFO] Starting pass1 with model gpt-5-nano
[INFO] Pass1 completed successfully { candidates: 3 }
[INFO] Processing cluster: Cluster 1 { pages: [1,2,3,4,5] }
[INFO] Cluster Cluster 1 completed
[WARN] Cluster Cluster 2 failed { error: "ai-timeout-120000" }
[ERROR] Pass3 failed { error: "Invalid JSON response" }
```

## Next Steps

If you encounter issues:
1. Copy the debug logs from the panel
2. Check server logs for additional context
3. Verify environment variables
4. Check API service status (OpenAI, Google Cloud)

