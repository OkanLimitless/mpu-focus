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

      const log = (...args: any[]) => {
        try {
          console.log('[CloudConvert Ingest]', ...args);
        } catch {}
      };

      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

      const run = async () => {
        try {
          const { fileUrl, fileName, jobId: providedJobId } = await request.json();
          if (!process.env.CLOUDCONVERT_API_KEY) {
            throw new Error('CLOUDCONVERT_API_KEY is not configured');
          }
          if (!fileUrl) {
            throw new Error('fileUrl is required');
          }

          log('Request received', { fileName, fileUrl, providedJobId });
          send({ step: 'Conversion', progress: 5, message: providedJobId ? 'Using existing CloudConvert job...' : 'Starting CloudConvert job...' });

          // Optional preflight: verify the file URL is reachable
          if (!providedJobId && fileUrl) {
            try {
              const headResp = await fetch(fileUrl, { method: 'HEAD' });
              log('Preflight HEAD status for fileUrl:', headResp.status);
              if (!headResp.ok) {
                log('Preflight HEAD failed body (truncated)');
              }
            } catch (e: any) {
              log('Preflight HEAD error (non-fatal):', e?.message || e);
            }
          }

          // Create job: import -> convert(pdf->jpg) -> export
          const jobResp = providedJobId ? null : await fetch(`${CC_API}/jobs`, {
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

          let jobId = providedJobId as string | undefined;
          if (!jobId) {
            if (!jobResp || !jobResp.ok) {
              const err = jobResp ? await jobResp.text() : 'No response';
              throw new Error(`CloudConvert job creation failed: ${err}`);
            }
            const job: CloudConvertJobResponse = await jobResp.json();
            jobId = job.data.id;
            log('Job created', { jobId, status: job?.data?.status });
            send({ step: 'Conversion', progress: 10, message: `Job created (${jobId}). Converting PDF to images...` });
          } else {
            log('Using provided jobId', { jobId });
          }

          // Helper to fetch export file URLs robustly
          const fetchExportFileUrls = async (jobId: string): Promise<string[]> => {
            // 1) List all tasks for the job and filter client-side to avoid server filter issues
            const listResp = await fetch(`${CC_API}/tasks?filter[job_id]=${jobId}`, {
              headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
            });
            if (listResp.ok) {
              const listJson: any = await listResp.json();
              const allTasks: any[] = listJson?.data || [];
              const exportTasks = allTasks.filter((t: any) => t?.attributes?.operation === 'export/url');
              log('Tasks listed', { total: allTasks.length, exportTasks: exportTasks.length });
              // Prefer finished tasks
              const finished = exportTasks.find((t: any) => t?.attributes?.status === 'finished') || exportTasks[0];
              if (finished?.id) {
                const taskResp = await fetch(`${CC_API}/tasks/${finished.id}`, {
                  headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
                });
                if (taskResp.ok) {
                  const taskJson: any = await taskResp.json();
                  // CloudConvert v2: result files live under data.attributes.result.files
                  const files = taskJson?.data?.attributes?.result?.files
                    || taskJson?.data?.result?.files
                    || [];
                  const urls = (files as any[]).map((f: any) => f.url).filter(Boolean);
                  log('Export task detail', { taskId: finished.id, status: taskJson?.data?.attributes?.status, files: (files as any[]).length, urlsFound: urls.length });
                  if (urls.length) return urls;
                } else {
                  log('Export task fetch failed', { status: taskResp.status });
                }
              } else {
                log('No export/url task found in job task list');
              }
            } else {
              log('Tasks list fetch failed', { status: listResp.status });
            }
            return [];
          };

          const getImageUrlsWithRetries = async (jobId: string): Promise<string[]> => {
            const maxAttempts = 15; // ~30-45s depending on backoff
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              const urls = await fetchExportFileUrls(jobId);
              log(`Export fetch attempt ${attempt}/${maxAttempts}: ${urls.length} urls`);
              send({ step: 'Conversion', progress: Math.min(85, 60 + attempt), message: `Waiting for export files (attempt ${attempt})...` });
              if (urls.length) return urls;
              const delayMs = Math.min(5000, 1000 + attempt * 1000); // 2s,3s,... up to 5s
              await sleep(delayMs);
            }
            return [];
          };

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
            log('Polling status', { jobId, status });

            if (status === 'error') {
              throw new Error('CloudConvert job failed');
            }
            if (status === 'finished') {
              // Try immediate extraction from included
              const exportTask = (statusJson as any).included?.find((t: any) => t.type === 'task' && t.attributes?.operation === 'export/url');
              let files = exportTask?.attributes?.result?.files || [];
              let imageUrls: string[] = (files || []).map((f: any) => f.url).filter(Boolean);
              
              // Fallback: explicit query to tasks endpoint
              if (!imageUrls.length) {
                log('No image URLs in included data; entering retry loop...');
                imageUrls = await getImageUrlsWithRetries(jobId);
              }

              if (!imageUrls.length) {
                log('No image URLs after retries');
                throw new Error('No image URLs returned by CloudConvert');
              }
              log('Image URLs ready', { count: imageUrls.length });
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
          log('Error:', error?.message || error);
          send({ step: 'Error', progress: 0, message: `CloudConvert ingest failed: ${error?.message || 'Unknown error'}`, error: true });
          controller.close();
        }
      };

      run();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    }
  });
}

