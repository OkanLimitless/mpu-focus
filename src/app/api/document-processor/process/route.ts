import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import vision from '@google-cloud/vision';
import { fromPath } from 'pdf2pic';
import OpenAI from 'openai';

// Initialize clients only when needed
function createVisionClient() {
  return new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
}

function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Template for data extraction
const EXTRACTION_TEMPLATE = `
You are an expert document analyst. Extract structured information from this OCR text and format it according to the following template:

"Overzicht van Delicten

Hieronder volgt een gedetailleerd overzicht van de verschillende strafbare feiten die in het dossier worden genoemd.

For each offense/delict found in the document, extract the following information:

Delict [NUMBER]: [TYPE OF OFFENSE] ([YEAR])

Wat is er gebeurd?
[Detailed description of what happened]

Wanneer is het gebeurd?
[When it happened - dates, times]

Waar is het gebeurd?
[Where it happened - location, court]

Wat is de boete en/of straf?
[Penalty/fine details]

Hoeveel punten heeft dit delict opgeleverd?
[Points on license if applicable]

At the end, include:

Algemene Gegevens

Hoeveel punten heeft deze persoon op zijn rijbewijs?
[Current points total]

Geboortedatum:
[Birth date]

Voornaam en achternaam:
[Full name]"

Extract all relevant information and format it exactly like this template. If information is missing, state that it's not mentioned in the document.
`;

interface ProcessingStatus {
  step: string;
  progress: number;
  message: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No file provided' })}\n\n`));
          controller.close();
          return;
        }

        const startTime = Date.now();
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Save uploaded file temporarily
        const tempFilePath = join('/tmp', `upload_${Date.now()}.pdf`);
        await writeFile(tempFilePath, buffer);

        // Send initial status
        const sendStatus = (status: ProcessingStatus) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status })}\n\n`));
        };

        sendStatus({
          step: 'Converting PDF to images',
          progress: 10,
          message: 'Breaking down PDF into individual pages...'
        });

        // Convert PDF to images
        const convert = fromPath(tempFilePath, {
          density: 300,
          saveFilename: 'page',
          savePath: '/tmp',
          format: 'png',
          width: 2000,
          height: 2000
        });

        const pageResults = await convert.bulk(-1, { responseType: 'image' });
        const totalPages = pageResults.length;

        sendStatus({
          step: 'Processing with OCR',
          progress: 30,
          message: `Processing ${totalPages} pages with Google Cloud Vision...`
        });

        // Process each page with OCR
        let allExtractedText = '';
        for (let i = 0; i < pageResults.length; i++) {
          const pageResult = pageResults[i];
          
          sendStatus({
            step: 'Processing with OCR',
            progress: 30 + (i / totalPages) * 40,
            message: `Processing page ${i + 1} of ${totalPages}...`
          });

          try {
            // Check if path exists
            if (!pageResult.path) {
              console.error(`No path for page ${i + 1}`);
              allExtractedText += `\n--- Page ${i + 1} ---\n[Error: No image path generated]\n`;
              continue;
            }

            // Perform OCR on the image
            const visionClient = createVisionClient();
            const [result] = await visionClient.textDetection(pageResult.path);
            const detections = result.textAnnotations;
            
            if (detections && detections.length > 0) {
              const pageText = detections[0].description || '';
              allExtractedText += `\n--- Page ${i + 1} ---\n${pageText}\n`;
            }

            // Clean up temporary image file
            await unlink(pageResult.path);
          } catch (ocrError) {
            console.error(`OCR error for page ${i + 1}:`, ocrError);
            allExtractedText += `\n--- Page ${i + 1} ---\n[OCR Error: Could not process this page]\n`;
          }
        }

        sendStatus({
          step: 'Extracting structured data',
          progress: 80,
          message: 'Using AI to extract and structure the data...'
        });

        // Use OpenAI to extract structured data
        let extractedData = '';
        try {
          const openai = createOpenAIClient();
          const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: EXTRACTION_TEMPLATE
              },
              {
                role: 'user',
                content: `Please extract and structure the information from this OCR text:\n\n${allExtractedText}`
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          });

          extractedData = completion.choices[0].message.content || 'No data could be extracted';
        } catch (llmError) {
          console.error('LLM extraction error:', llmError);
          extractedData = `Error during data extraction: ${llmError instanceof Error ? llmError.message : 'Unknown error'}\n\nRaw OCR Text:\n${allExtractedText}`;
        }

        sendStatus({
          step: 'Finalizing',
          progress: 95,
          message: 'Cleaning up and preparing results...'
        });

        // Clean up temporary PDF file
        await unlink(tempFilePath);

        const processingTime = Math.round((Date.now() - startTime) / 1000);

        // Send final result
        const result = {
          id: `doc_${Date.now()}`,
          fileName: file.name,
          totalPages,
          extractedData,
          processingTime,
          createdAt: new Date().toISOString()
        };

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ result })}\n\n`));
        controller.close();

      } catch (error) {
        console.error('Document processing error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Processing failed' 
        })}\n\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}