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

          // Create job: import -> convert(pdf->jpg) -> export (to R2 if configured)
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
                // Prefer exporting directly to Cloudflare R2 if configured
                'export-1': (process.env.R2_BUCKET && process.env.R2_S3_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) ? {
                  operation: 'export/s3',
                  input: 'convert-1',
                  bucket: process.env.R2_BUCKET,
                  endpoint: process.env.R2_S3_ENDPOINT,
                  region: 'auto',
                  force_path_style: true,
                  access_key_id: process.env.R2_ACCESS_KEY_ID,
                  secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
                  key: 'tmp/cloudconvert/${job_id}/${filename}',
                  acl: 'public-read',
                  content_type: 'image/jpeg',
                  cache_control: 'public, max-age=86400'
                } : { operation: 'export/url', input: 'convert-1', inline: false, archive_multiple_files: false }
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
              const summarized = allTasks.map((t: any) => ({
                id: t?.id,
                operation: t?.attributes?.operation || t?.operation,
                status: t?.attributes?.status || t?.status,
                name: t?.attributes?.name || t?.name
              }));
              log('Tasks listed', { total: allTasks.length, exportTasks: summarized.filter(t => (t.operation || '').includes('export')).length });

              // Prefer finished export tasks
              const exportCandidates = summarized.filter(t => (t.operation || '').includes('export'));
              const finished = exportCandidates.find(t => t.status === 'finished') || exportCandidates[0];
              if (finished?.id) {
                const taskResp = await fetch(`${CC_API}/tasks/${finished.id}`, {
                  headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
                });
                if (taskResp.ok) {
                  const taskJson: any = await taskResp.json();
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
                log('No export task found in job task list');
              }
            } else {
              log('Tasks list fetch failed', { status: listResp.status });
            }

            // 2) Fallback: fetch job with include=tasks and locate export task id, then fetch detail
            try {
              const jobTasksResp = await fetch(`${CC_API}/jobs/${jobId}?include=tasks`, {
                headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
              });
              if (jobTasksResp.ok) {
                const jobJson: any = await jobTasksResp.json();
                const includedTasks: any[] = jobJson?.included || [];
                const exportFromIncluded = includedTasks.find((t: any) => {
                  const op = t?.attributes?.operation || t?.operation;
                  return (op || '').includes('export');
                });
                if (exportFromIncluded?.id) {
                  log('Found export task in job included', { taskId: exportFromIncluded.id, status: exportFromIncluded?.attributes?.status });
                  const tResp = await fetch(`${CC_API}/tasks/${exportFromIncluded.id}`, {
                    headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
                  });
                  if (tResp.ok) {
                    const tJson: any = await tResp.json();
                    const files = tJson?.data?.attributes?.result?.files
                      || tJson?.data?.result?.files
                      || [];
                    const urls = (files as any[]).map((f: any) => f.url).filter(Boolean);
                    log('Export task detail (from job included)', { files: (files as any[]).length, urlsFound: urls.length });
                    if (urls.length) return urls;
                  } else {
                    log('Export task fetch (from job included) failed', { status: tResp.status });
                  }
                } else {
                  log('No export task found in job included');
                }
              } else {
                log('Job fetch with include=tasks failed', { status: jobTasksResp.status });
              }
            } catch (e: any) {
              log('Fallback job+tasks fetch error', { error: e?.message || e });
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
              const includedTasks: any[] = (statusJson as any).included || [];
              log('Included tasks summary', {
                includedCount: includedTasks.length,
                samples: includedTasks.slice(0, 3).map((t: any) => ({ id: t?.id, type: t?.type, op: t?.attributes?.operation, status: t?.attributes?.status, files: (t?.attributes?.result?.files || []).length }))
              });

              let imageUrls: string[] = [];

              // If exporting to R2 (export/s3), construct public URLs using configured base
              const r2PublicBase = process.env.R2_PUBLIC_BASE_URL;
              if (r2PublicBase && process.env.R2_BUCKET) {
                try {
                  const convertTask = includedTasks.find((t: any) => (t?.attributes?.operation || '') === 'convert');
                  const convertFiles = convertTask?.attributes?.result?.files || [];
                  if (Array.isArray(convertFiles) && convertFiles.length > 0) {
                    imageUrls = convertFiles
                      .map((f: any) => `${r2PublicBase.replace(/\/$/, '')}/tmp/cloudconvert/${jobId}/${encodeURIComponent(f.filename)}`);
                    log('Constructed R2 image URLs', { count: imageUrls.length });
                  }
                } catch (e: any) {
                  log('R2 URL construction failed; will fallback', { error: e?.message || e });
                }
              }

              // If not R2 or construction failed, fallback to export/url discovery
              if (!imageUrls.length) {
                const exportTask = includedTasks.find((t: any) => (t?.attributes?.result?.files || []).length > 0)
                  || includedTasks.find((t: any) => ((t?.attributes?.operation || '').includes('export')))
                  || (statusJson as any).included?.find((t: any) => t.type === 'task' && (t.attributes?.operation || '').includes('export'));
                const files = exportTask?.attributes?.result?.files || [];
                imageUrls = (files || []).map((f: any) => f.url).filter(Boolean);
              }

              // Fallback A: fetch export task detail directly by ID if present
              if ((!imageUrls.length) && exportTask?.id) {
                try {
                  log('Fetching export task detail by id from included', { taskId: exportTask.id });
                  const taskResp = await fetch(`${CC_API}/tasks/${exportTask.id}`, {
                    headers: { 'Authorization': `Bearer ${process.env.CLOUDCONVERT_API_KEY}` }
                  });
                  if (taskResp.ok) {
                    const taskJson: any = await taskResp.json();
                    const detailFiles = taskJson?.data?.attributes?.result?.files
                      || taskJson?.data?.result?.files
                      || [];
                    imageUrls = (detailFiles as any[]).map((f: any) => f.url).filter(Boolean);
                    log('Export task detail (included-id fetch)', { files: (detailFiles as any[]).length, urlsFound: imageUrls.length });
                  } else {
                    log('Export task detail fetch failed', { status: taskResp.status });
                  }
                } catch (e: any) {
                  log('Failed to fetch export task by id', { error: e?.message || e });
                }
              }

              // Fallback B: explicit query to tasks endpoint
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

