import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
// Google Cloud Vision will be dynamically imported to avoid build issues
import OpenAI from 'openai';
// PDF parsing will be dynamically imported to avoid build issues

// Initialize clients only when needed
async function createVisionClient() {
  const { default: vision } = await import('@google-cloud/vision');
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
          step: 'Extracting text from PDF',
          progress: 10,
          message: 'Attempting direct text extraction...'
        });

        // First, try direct text extraction from PDF
        let allExtractedText = '';
        let useOCR = false;
        
        try {
          // Dynamically import pdf-parse to avoid build issues
          const { default: pdfParse } = await import('pdf-parse');
          const pdfData = await pdfParse(buffer);
          allExtractedText = pdfData.text;
          
          // Check if extracted text is meaningful (not just spaces/newlines)
          const meaningfulText = allExtractedText.replace(/\s/g, '');
          if (meaningfulText.length < 100) {
            useOCR = true;
            sendStatus({
              step: 'Switching to OCR',
              progress: 20,
              message: 'PDF contains mostly images, switching to OCR processing...'
            });
          } else {
            sendStatus({
              step: 'Text extraction successful',
              progress: 50,
              message: `Extracted ${allExtractedText.length} characters from PDF`
            });
          }
        } catch (pdfError) {
          console.error('PDF text extraction failed:', pdfError);
          useOCR = true;
          sendStatus({
            step: 'Switching to OCR',
            progress: 20,
            message: 'Direct text extraction failed, switching to OCR...'
          });
        }

        // If direct extraction failed or produced poor results, use OCR
        if (useOCR) {
          sendStatus({
            step: 'Processing with OCR',
            progress: 30,
            message: 'Processing document with Google Cloud Vision OCR...'
          });

          try {
            // Use Google Cloud Vision to process the entire PDF
            const visionClient = await createVisionClient();
            const [result] = await visionClient.textDetection(tempFilePath);
            const detections = result.textAnnotations;
            
            if (detections && detections.length > 0) {
              allExtractedText = detections[0].description || '';
              sendStatus({
                step: 'OCR processing complete',
                progress: 70,
                message: `OCR extracted ${allExtractedText.length} characters`
              });
            } else {
              allExtractedText = '[No text could be extracted from this document]';
            }
          } catch (ocrError) {
            console.error('OCR processing failed:', ocrError);
            allExtractedText = `[Error during OCR processing: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}]`;
          }
        }

        sendStatus({
          step: 'Extracting structured data',
          progress: 75,
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

        // Estimate page count based on content length
        const estimatedPages = Math.max(1, Math.ceil(allExtractedText.length / 2000));

        // Send final result
        const result = {
          id: `doc_${Date.now()}`,
          fileName: file.name,
          totalPages: estimatedPages,
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