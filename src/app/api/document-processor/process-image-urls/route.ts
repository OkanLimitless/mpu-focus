import { NextRequest } from 'next/server';
import { VISION_ANALYSIS_PROMPT } from '@/lib/document-processor';

// Function to consolidate and clean up batch results
function consolidateBatchResults(allExtractedData: string, totalPages: number): string {
  // Split the data by batch markers
  const batches = allExtractedData.split('--- Batch').filter(batch => batch.trim().length > 0);
  
  // Extract successful results and merge duplicates
  const validBatches = batches.filter(batch => {
    const content = batch.toLowerCase();
    return !content.includes("i'm sorry, i can't assist") && 
           !content.includes("i'm unable to") &&
           !content.includes("i cannot process") &&
           content.includes("delict") || content.includes("naam") || content.includes("geboortedatum");
  });

  // Create consolidated header
  let consolidatedResult = `# Geconsolideerd Overzicht van Delicten\n\n`;
  consolidatedResult += `**Totaal aantal pagina's geprocessed:** ${totalPages}\n`;
  consolidatedResult += `**Aantal succesvolle batches:** ${validBatches.length}\n\n`;
  
  // Extract all delicts from successful batches
  const allDelicts: string[] = [];
  const personalInfo = {
    name: '',
    birthDate: '',
    totalPoints: ''
  };

  validBatches.forEach(batch => {
    // Extract delicts using a simpler approach
    const delictSections = batch.split('**Delict').filter(section => section.includes(':'));
    delictSections.forEach(section => {
      if (section.trim()) {
        allDelicts.push('**Delict' + section.split('**Algemene')[0]);
      }
    });

    // Extract personal information
    const nameMatch = batch.match(/\*\*Voornaam en achternaam:\*\*\s*([^\n]+)/);
    if (nameMatch && nameMatch[1] && !personalInfo.name) {
      personalInfo.name = nameMatch[1].trim();
    }

    const birthMatch = batch.match(/\*\*Geboortedatum:\*\*\s*([^\n]+)/);
    if (birthMatch && birthMatch[1] && !personalInfo.birthDate) {
      personalInfo.birthDate = birthMatch[1].trim();
    }
  });

  // Add consolidated delicts
  if (allDelicts.length > 0) {
    consolidatedResult += `## Gevonden Delicten\n\n`;
    allDelicts.forEach((delict, index) => {
      consolidatedResult += `### ${delict}\n\n`;
    });
  } else {
    consolidatedResult += `## Gevonden Delicten\n\n*Geen specifieke delicten gedetecteerd in de geprocesste batches.*\n\n`;
  }

  // Add personal information section
  consolidatedResult += `## Algemene Gegevens\n\n`;
  consolidatedResult += `- **Voornaam en achternaam:** ${personalInfo.name || 'Niet vermeld'}\n`;
  consolidatedResult += `- **Geboortedatum:** ${personalInfo.birthDate || 'Niet vermeld'}\n`;
  consolidatedResult += `- **Huidige punten op rijbewijs:** ${personalInfo.totalPoints || 'Niet vermeld'}\n\n`;

  // Add processing notes
  consolidatedResult += `## Verwerkingsnotities\n\n`;
  consolidatedResult += `- Document bevatte ${totalPages} pagina's\n`;
  consolidatedResult += `- ${validBatches.length} van de batches leverden bruikbare resultaten op\n`;
  
  if (validBatches.length < batches.length) {
    consolidatedResult += `- **Let op:** Sommige batches konden niet volledig worden verwerkt. Dit kan komen door lege pagina's, slechte beeldkwaliteit, of andere factoren.\n`;
  }

  return consolidatedResult;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const sendStatus = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      const processImageUrls = async () => {
        try {
          const { imageUrls, fileName } = await request.json();
          
          if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            throw new Error('No image URLs provided');
          }

          sendStatus({
            step: 'Processing images',
            progress: 0,
            message: `Analyzing ${imageUrls.length} pages with AI...`
          });

          // Process with GPT-4o Vision
          const { default: OpenAI } = await import('openai');
          
          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          let allExtractedData = '';
          
          // Use very large batches for ultra-fast processing - GPT-4o can handle this easily
          const maxPagesPerBatch = imageUrls.length > 100 ? 20 : 25; // Ultra-large batches for speed

          if (imageUrls.length <= maxPagesPerBatch) {
            // Process all images at once for smaller documents
            sendStatus({
              step: 'AI Analysis',
              progress: 20,
              message: `Analyzing all ${imageUrls.length} pages...`
            });

            const imageMessages = imageUrls.map((imageUrl) => ({
              type: "image_url" as const,
              image_url: { url: imageUrl, detail: "high" as const } // Use "high" for better OCR quality
            } as any));

            const completion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: VISION_ANALYSIS_PROMPT },
                    ...imageMessages
                  ],
                },
              ],
              max_tokens: 4000,
            });

            allExtractedData = completion.choices[0]?.message?.content || '';

          } else {
            // Process in batches for large documents
            const totalBatches = Math.ceil(imageUrls.length / maxPagesPerBatch);
            
            for (let i = 0; i < imageUrls.length; i += maxPagesPerBatch) {
              const batch = imageUrls.slice(i, i + maxPagesPerBatch);
              const batchNumber = Math.floor(i / maxPagesPerBatch) + 1;
              
              sendStatus({
                step: 'AI Analysis',
                progress: 10 + (batchNumber / totalBatches) * 70,
                message: `Processing batch ${batchNumber}/${totalBatches} (${batch.length} pages)...`
              });

                              const imageMessages = batch.map((imageUrl) => ({
                  type: "image_url" as const,
                  image_url: { url: imageUrl, detail: "high" as const } // Use "high" for better OCR quality
                } as any));

              // Retry logic for failed requests
              let batchResult = '';
              let retryCount = 0;
              const maxRetries = 2;

              while (retryCount <= maxRetries) {
                try {
                  const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                      {
                        role: "user",
                        content: [
                          { 
                            type: "text", 
                            text: `${VISION_ANALYSIS_PROMPT}\n\nIMPORTANT CONTEXT: This is batch ${batchNumber} of ${totalBatches} from a ${imageUrls.length}-page legal document. Previous batches have successfully extracted information. You MUST process these images - they contain readable scanned text. Extract any visible offense/delict information, personal details, or legal data from these specific pages.` 
                          },
                          ...imageMessages
                        ],
                      },
                    ],
                    max_tokens: 4000,
                  });

                  batchResult = completion.choices[0]?.message?.content || '';
                  
                  // Validate the result - check for refusal patterns
                  const refusalPatterns = [
                    "I'm sorry, I can't assist",
                    "I'm unable to",
                    "I cannot process",
                    "I can't analyze",
                    "I can't process PDFs directly"
                  ];
                  
                  const isRefusal = refusalPatterns.some(pattern => 
                    batchResult.toLowerCase().includes(pattern.toLowerCase())
                  );
                  
                  if (isRefusal && retryCount < maxRetries) {
                    // This is a refusal, treat it as an error and retry
                    throw new Error('AI refused to process batch - retrying with stronger prompt');
                  }
                  
                  break; // Success, exit retry loop

                } catch (error: any) {
                  retryCount++;
                  
                  if (error?.code === 'invalid_image_url' && retryCount <= maxRetries) {
                    sendStatus({
                      step: 'AI Analysis',
                      progress: 10 + (batchNumber / totalBatches) * 70,
                      message: `Batch ${batchNumber} failed, retrying... (${retryCount}/${maxRetries})`
                    });
                    
                    // Shorter retry delay for faster recovery
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                  } else {
                    throw error; // Re-throw if not retryable or max retries reached
                  }
                }
              }

              allExtractedData += `\n\n--- Batch ${batchNumber} Results ---\n${batchResult}`;

                              // Small delay between batches to prevent API overwhelming
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          sendStatus({
            step: 'Finalizing',
            progress: 90,
            message: 'Consolidating and organizing extracted data...'
          });

          // Consolidate and clean up the batch results
          const cleanedData = consolidateBatchResults(allExtractedData, imageUrls.length);

          // Structure the final result
          const result = {
            fileName: fileName || 'document.pdf',
            totalPages: imageUrls.length,
            extractedData: cleanedData,
            processingMethod: 'UploadThing + GPT-4o Vision',
            timestamp: new Date().toISOString(),
            processingNotes: 'Results consolidated from multiple AI processing batches'
          };

          sendStatus({
            step: 'Complete',
            progress: 100,
            message: 'Document processing completed successfully!',
            result
          });

          controller.close();
          
        } catch (error) {
          console.error('Processing error:', error);
          sendStatus({
            step: 'Error',
            progress: 0,
            message: error instanceof Error ? error.message : 'Processing failed',
            error: true
          });
          controller.close();
        }
      };

      processImageUrls();
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