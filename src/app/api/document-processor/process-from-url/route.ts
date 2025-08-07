import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send deprecation message
      const errorMessage = {
        step: 'Error',
        progress: 0,
        message: 'Large file processing via UploadThing is no longer needed. Please refresh the page - PDFs are now processed directly in your browser for better performance and compatibility.'
      };
      
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorMessage)}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}