// Cloudflare Worker to serve PDF.js worker file
// Deploy this to: https://pdf-worker.your-domain.workers.dev/

export default {
  async fetch(request, env, ctx) {
    // Handle CORS for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    try {
      // Fetch the PDF.js worker from unpkg CDN
      const workerUrl = 'https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';
      
      const response = await fetch(workerUrl, {
        headers: {
          'User-Agent': 'Cloudflare-Worker/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch worker: ${response.status}`);
      }

      // Get the worker content
      const workerContent = await response.text();

      // Return the worker with proper headers
      return new Response(workerContent, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/javascript',
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
          'X-Served-By': 'Cloudflare-Worker',
        },
      });

    } catch (error) {
      console.error('Error serving PDF worker:', error);
      
      return new Response(JSON.stringify({
        error: 'Failed to serve PDF worker',
        message: error.message,
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }
  },
};