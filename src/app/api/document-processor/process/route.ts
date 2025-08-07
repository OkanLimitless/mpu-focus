import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

// Initialize OpenAI client
function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Template for GPT-4o vision analysis
const VISION_ANALYSIS_PROMPT = `
You are an expert document analyst with OCR capabilities. Analyze these PDF page images and extract structured information according to the following template:

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

Instructions:
1. Carefully read and analyze all the images provided
2. Extract text using your vision capabilities
3. Structure the information according to the template above
4. If information is missing, state that it's not mentioned in the document
5. Be thorough and accurate in your extraction
6. Maintain the exact format shown in the template
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
          message: 'Converting PDF pages to images for GPT-4o analysis...'
        });

        // Convert PDF to images using pdf-poppler
        let imagePages: string[] = [];
        try {
          const pdfPoppler = await import('pdf-poppler');
          
          const options = {
            format: 'jpeg' as const,
            out_dir: '/tmp',
            out_prefix: `pdf_${Date.now()}`,
            page: null, // Convert all pages
            file_path: tempFilePath
          };

          const imageFiles = await pdfPoppler.convert(options);
          imagePages = imageFiles.map((file) => file.path);
          
          sendStatus({
            step: 'PDF conversion complete',
            progress: 30,
            message: `Converted ${imagePages.length} pages to images`
          });
        } catch (conversionError) {
          console.error('PDF conversion failed:', conversionError);
          throw new Error(`Failed to convert PDF to images: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
        }

        sendStatus({
          step: 'Processing with GPT-4o Vision',
          progress: 40,
          message: 'Analyzing document images with GPT-4o vision capabilities...'
        });

        // Process images with GPT-4o vision
        let extractedData = '';
        try {
          const openai = createOpenAIClient();
          
          // Prepare images for GPT-4o
          const imageMessages = [];
          
          for (let i = 0; i < Math.min(imagePages.length, 20); i++) { // Limit to 20 pages for API limits
            const imagePath = imagePages[i];
            const imageBuffer = await readFile(imagePath);
            const base64Image = imageBuffer.toString('base64');
            
            imageMessages.push({
              type: "image_url" as const,
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high" as const
              }
            });

            sendStatus({
              step: 'Processing with GPT-4o Vision',
              progress: 40 + (i / imagePages.length) * 30,
              message: `Processing page ${i + 1} of ${imagePages.length}...`
            });
          }

          // Send all images to GPT-4o for analysis
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: "text",
                    text: VISION_ANALYSIS_PROMPT
                  },
                  ...imageMessages
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          });

          extractedData = completion.choices[0].message.content || 'No data could be extracted';
          
          sendStatus({
            step: 'GPT-4o analysis complete',
            progress: 80,
            message: 'Document analysis completed successfully'
          });
        } catch (visionError) {
          console.error('GPT-4o vision processing failed:', visionError);
          extractedData = `Error during GPT-4o vision processing: ${visionError instanceof Error ? visionError.message : 'Unknown error'}`;
        }

        // Clean up image files
        for (const imagePath of imagePages) {
          try {
            await unlink(imagePath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup image file:', imagePath);
          }
        }

        sendStatus({
          step: 'Finalizing',
          progress: 95,
          message: 'Cleaning up and preparing results...'
        });

        // Clean up temporary PDF file
        await unlink(tempFilePath);

        const processingTime = Math.round((Date.now() - startTime) / 1000);

        // Use actual page count from images
        const actualPages = imagePages.length;

        // Send final result
        const result = {
          id: `doc_${Date.now()}`,
          fileName: file.name,
          totalPages: actualPages,
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