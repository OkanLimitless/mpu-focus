import { NextRequest } from 'next/server';

interface CloudConvertJobResponse {
  data: { id: string; status: string };
  included?: any[];
}

const CC_API = 'https://api.cloudconvert.com/v2';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const run = async () => {
        try {
          const { fileUrl, fileName } = await request.json();
          if (!process.env.CLOUDCONVERT_API_KEY) {
            throw new Error('CLOUDCONVERT_API_KEY is not configured');
          }
          if (!fileUrl) {
            throw new Error('fileUrl is required');
          }

          send({ step: 'Conversion', progress: 5, message: 'Starting CloudConvert job...' });

          // Create job: import -> convert(pdf->jpg) -> export
          const jobResp = await fetch(`${CC_API}/jobs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              tasks: {
                'import-1': { operation: 'import/url', url: fileUrl },
                'convert-1': {
                  operation: 'convert',
                  input: 'import-1',
                  output_format: 'jpg',
                  input_format: 'pdf',
                  density: 200,
                  quality: 85,
                  page_range: '1-'
                },
                'export-1': { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
              }
            })
          });

          if (!jobResp.ok) {
            const err = await jobResp.text();
            throw new Error(`CloudConvert job creation failed: ${err}`);
          }

          const job: CloudConvertJobResponse = await jobResp.json();
          const jobId = job.data.id;
          send({ step: 'Conversion', progress: 10, message: `Job created (${jobId}). Converting PDF to images...` });

          // Poll job status
          let done = false;
          const startedAt = Date.now();
          while (!done) {
            await new Promise(r => setTimeout(r, 2000));

            const statusResp = await fetch(`${CC_API}/jobs/${jobId}?include=tasks`, {
              headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
            });
            if (!statusResp.ok) {
              const err = await statusResp.text();
              throw new Error(`CloudConvert status failed: ${err}`);
            }
            const statusJson: CloudConvertJobResponse = await statusResp.json();
            const status = statusJson.data.status;

            if (status === 'error') {
              throw new Error('CloudConvert job failed');
            }
            if (status === 'finished') {
              // Find export task id and fetch its result explicitly
              const exportTask = (statusJson as any).included?.find((t: any) => t.type === 'task' && t.attributes?.operation === 'export/url');
              let imageUrls: string[] = [];
              if (exportTask?.id) {
                const taskResp = await fetch(`${CC_API}/tasks/${exportTask.id}`, {
                  headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
                });
                if (taskResp.ok) {
                  const taskJson: any = await taskResp.json();
                  const files = taskJson?.data?.result?.files || [];
                  imageUrls = files.map((f: any) => f.url).filter(Boolean);
                }
              }
              if (!imageUrls.length) {
                const files = exportTask?.attributes?.result?.files || [];
                imageUrls = files.map((f: any) => f.url).filter(Boolean);
              }
              if (!imageUrls.length) {
                throw new Error('No image URLs returned by CloudConvert');
              }
              send({ step: 'Converted', progress: 70, message: `Converted to ${imageUrls.length} pages.`, imageUrls, fileName });
              done = true;
              break;
            }

            const elapsed = Math.min(60, Math.floor((Date.now() - startedAt) / 1000));
            send({ step: 'Conversion', progress: 10 + Math.min(50, Math.floor(elapsed / 60 * 50)), message: `Converting... (${status})` });
          }

          send({ step: 'ReadyForAnalysis', progress: 75, message: 'Images ready. Client will start AI analysis.' });
          controller.close();
        } catch (error: any) {
          send({ step: 'Error', progress: 0, message: `CloudConvert ingest failed: ${error?.message || 'Unknown error'}`, error: true });
          controller.close();
        }
      };

      run();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

