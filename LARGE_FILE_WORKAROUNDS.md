# 📁 Large File Workarounds - Document Processor

## 🎯 **Problem**: Need to Process Files Larger Than 20MB

The current 20MB limit exists to prevent 413 "Payload Too Large" errors, but you're right - some legal documents might be larger. Here are the best workarounds:

## 🚀 **Option 1: PDF Conversion Quality Settings (Recommended)**

### **Lower DPI for Larger Files**
Modify the PDF conversion to use adaptive quality:

```typescript
// In pdf conversion options
const getDPIBasedOnFileSize = (fileSize: number) => {
  if (fileSize < 10 * 1024 * 1024) return 300; // High quality for small files
  if (fileSize < 30 * 1024 * 1024) return 200; // Medium quality
  if (fileSize < 50 * 1024 * 1024) return 150; // Lower quality
  return 100; // Very compressed for huge files
};

const options = {
  format: 'jpeg' as const,
  out_dir: '/tmp',
  out_prefix: `pdf_${Date.now()}`,
  page: null,
  file_path: tempFilePath,
  // Dynamic DPI based on file size
  out_size: getDPIBasedOnFileSize(file.size)
};
```

**Benefits**:
- ✅ Handles files up to 50-100MB
- ✅ Automatic quality adjustment
- ✅ Still readable text extraction
- ✅ No infrastructure changes needed

## 🚀 **Option 2: Progressive Page Processing**

### **Process One Page at a Time**
Instead of sending all pages at once, process individually:

```typescript
// Process pages individually to avoid payload limits
for (let i = 0; i < imagePages.length; i++) {
  const singlePageResult = await processPageWithGPT4o(imagePages[i], i + 1);
  combinedResults.push(singlePageResult);
  
  // Update progress
  sendStatus({
    step: 'Processing pages individually',
    progress: 40 + (i / imagePages.length) * 40,
    message: `Processed page ${i + 1} of ${imagePages.length}`
  });
}
```

**Benefits**:
- ✅ No payload size limits
- ✅ Can handle unlimited pages
- ✅ More granular progress tracking
- ✅ Better error isolation

## 🚀 **Option 3: Client-Side PDF Splitting**

### **Split Large PDFs Before Upload**
Add functionality to split large PDFs on the client side:

```typescript
// Frontend: Split large PDFs
const splitLargePDF = async (file: File, maxSizePerPart: number) => {
  const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
  const totalPages = pdfDoc.getPageCount();
  const parts = [];
  
  // Calculate pages per part based on size
  const pagesPerPart = Math.ceil(totalPages / Math.ceil(file.size / maxSizePerPart));
  
  for (let i = 0; i < totalPages; i += pagesPerPart) {
    const newPdf = await PDFDocument.create();
    const pagesToCopy = Math.min(pagesPerPart, totalPages - i);
    
    for (let j = 0; j < pagesToCopy; j++) {
      const [page] = await newPdf.copyPages(pdfDoc, [i + j]);
      newPdf.addPage(page);
    }
    
    const pdfBytes = await newPdf.save();
    parts.push(new File([pdfBytes], `${file.name}_part${i / pagesPerPart + 1}.pdf`));
  }
  
  return parts;
};
```

**Benefits**:
- ✅ Unlimited file size support
- ✅ No server-side changes needed
- ✅ Better user control
- ✅ Parallel processing possible

## 🚀 **Option 4: Streaming File Upload**

### **Upload and Process in Chunks**
Process the PDF as it's being uploaded:

```typescript
// Stream processing approach
export async function streamProcessPDF(request: NextRequest) {
  const reader = request.body?.getReader();
  let pdfBuffer = new Uint8Array();
  
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    
    // Accumulate PDF data
    const newBuffer = new Uint8Array(pdfBuffer.length + value.length);
    newBuffer.set(pdfBuffer);
    newBuffer.set(value, pdfBuffer.length);
    pdfBuffer = newBuffer;
    
    // Process pages as we get enough data
    if (pdfBuffer.length > CHUNK_SIZE) {
      await processPartialPDF(pdfBuffer);
    }
  }
}
```

## 🚀 **Option 5: External Storage + Processing**

### **Upload to S3/Cloud Storage First**
Use external storage for large files:

```typescript
// Upload large files to S3 first
const uploadToS3 = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload-large-file', {
    method: 'POST',
    body: formData
  });
  
  return response.json(); // Returns S3 URL
};

// Process from S3 URL
const processFromS3 = async (s3Url: string) => {
  // Download and process in chunks
  const response = await fetch(s3Url);
  const pdfBuffer = await response.arrayBuffer();
  // Process normally
};
```

**Benefits**:
- ✅ No file size limits
- ✅ Better for very large files (100MB+)
- ✅ Scalable architecture
- ✅ Can handle concurrent processing

## 🎯 **Recommended Implementation Strategy**

### **Phase 1: Quick Win (Adaptive Quality)**
```typescript
// Update your current code with adaptive DPI
const getOptimalSettings = (fileSize: number) => {
  if (fileSize < 15 * 1024 * 1024) {
    return { maxPages: 10, quality: 'medium', limit: '20MB' };
  } else if (fileSize < 35 * 1024 * 1024) {
    return { maxPages: 15, quality: 'low', limit: '35MB' };
  } else {
    return { maxPages: 20, quality: 'ultra_low', limit: '50MB' };
  }
};
```

### **Phase 2: Page-by-Page Processing**
Implement individual page processing for unlimited size support.

### **Phase 3: Client-Side Splitting** 
Add PDF splitting for ultimate flexibility.

## 📊 **Expected Results with Each Option**

| Option | Max File Size | Processing Time | Complexity | Quality |
|--------|---------------|-----------------|------------|---------|
| Current | 20MB | Fast | Low | High |
| Adaptive Quality | 50MB | Medium | Low | Medium |
| Page-by-Page | Unlimited | Slower | Medium | High |
| Client Splitting | Unlimited | Fast | High | High |
| External Storage | Unlimited | Medium | High | High |

## 🔧 **Implementation Priority**

### **Immediate (This Week)**:
1. **Adaptive DPI/Quality** - Easy to implement, 2.5x size increase
2. **Increase batch size limits** - Simple config change

### **Short Term (Next Week)**:
1. **Page-by-page processing** - More robust, unlimited size
2. **Better progress tracking** - Enhanced UX

### **Long Term (Future)**:
1. **Client-side splitting** - Ultimate flexibility
2. **External storage** - Enterprise-grade solution

## 💡 **Quick Implementation**

Want me to implement the **adaptive quality** approach right now? It's the easiest way to get from 20MB to 50MB+ support with minimal changes:

```typescript
// Quick fix: Adaptive processing based on file size
const processLargeDocument = (file: File) => {
  if (file.size < 20 * 1024 * 1024) {
    return processWithHighQuality(file);
  } else if (file.size < 50 * 1024 * 1024) {
    return processWithMediumQuality(file);
  } else {
    return processWithLowQuality(file);
  }
};
```

Which approach would you like me to implement first? The **adaptive quality** is the quickest win to get you processing larger files immediately!