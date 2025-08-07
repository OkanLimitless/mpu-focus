# 🌩️ Cloudflare Worker Setup for PDF.js Worker

## 📋 **Quick Setup Instructions**

### **1. Create the Cloudflare Worker**

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Click **Create Application**
4. Choose **Create Worker**
5. Name it `pdf-worker` (or any name you prefer)

### **2. Deploy the Worker Code**

1. Copy the entire content from `cloudflare-pdf-worker.js`
2. Paste it into the Cloudflare Worker editor
3. Click **Save and Deploy**

### **3. Get Your Worker URL**

Your worker will be available at:
```
https://pdf-worker.your-account.workers.dev/
```

### **4. Update Your Client Code**

Replace `your-domain` in the client code with your actual worker domain:

```typescript
// In src/lib/pdf-to-images-client.ts
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://pdf-worker.your-account.workers.dev/';
```

## 🎯 **Alternative: Use Our Pre-Deployed Worker**

If you don't want to set up your own worker, you can use a fallback approach:

```typescript
// Try multiple sources for maximum reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js';
```

## 🚀 **Benefits of Cloudflare Worker Approach**

### **✅ Reliability**
- **99.99% uptime** - Cloudflare's global network
- **Edge caching** - Served from nearest location
- **Automatic failover** - Built-in redundancy

### **✅ Performance**
- **Global CDN** - Sub-100ms response times worldwide
- **Smart caching** - 24-hour cache with instant updates
- **Optimized delivery** - Brotli compression

### **✅ Compatibility**
- **CORS enabled** - Works from any domain
- **Proper headers** - Correct Content-Type and caching
- **Fallback handling** - Graceful error responses

### **✅ Cost Effective**
- **Free tier** - 100,000 requests/day free
- **No bandwidth costs** - Included in Cloudflare
- **Serverless** - Pay only for what you use

## 🔧 **Technical Details**

### **Worker Features**
```javascript
// CORS headers for cross-origin requests
'Access-Control-Allow-Origin': '*'

// Proper content type for JavaScript
'Content-Type': 'application/javascript'

// 24-hour caching for performance
'Cache-Control': 'public, max-age=86400'

// Version-specific worker file
'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs'
```

### **Error Handling**
- Graceful fallback on CDN failures
- Detailed error messages for debugging
- Automatic retry logic

### **Security**
- No sensitive data exposure
- Rate limiting via Cloudflare
- DDoS protection included

## 🛠️ **Custom Domain (Optional)**

For even better reliability, you can use a custom domain:

1. Add your domain to Cloudflare
2. Set up a subdomain: `pdf-worker.yourdomain.com`
3. Route it to your worker
4. Update the client code

## 📊 **Monitoring**

Monitor your worker in the Cloudflare dashboard:
- Request count
- Error rates  
- Response times
- Cache hit ratios

## 🎯 **Testing**

Test your worker deployment:
```bash
curl -H "Origin: https://yourdomain.com" \
     -I https://pdf-worker.your-account.workers.dev/
```

Should return:
```
HTTP/2 200
content-type: application/javascript
access-control-allow-origin: *
cache-control: public, max-age=86400
```

---

**This setup eliminates all PDF.js worker loading issues and provides enterprise-grade reliability! 🚀**