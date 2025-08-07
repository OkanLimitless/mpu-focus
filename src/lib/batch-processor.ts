import { createOpenAIClient } from './document-processor';

interface BatchProcessingOptions {
  maxPagesPerBatch: number;
  maxPayloadSize: number; // in bytes
  analysisPrompt: string;
}

interface ProcessedBatch {
  batchNumber: number;
  pages: number[];
  extractedData: string;
  error?: string;
}

export async function processPDFInBatches(
  imagePages: string[],
  options: BatchProcessingOptions
): Promise<string> {
  const { maxPagesPerBatch, maxPayloadSize, analysisPrompt } = options;
  const batches: ProcessedBatch[] = [];
  
  // Split images into batches
  for (let i = 0; i < imagePages.length; i += maxPagesPerBatch) {
    const batchPages = imagePages.slice(i, i + maxPagesPerBatch);
    const batchNumber = Math.floor(i / maxPagesPerBatch) + 1;
    
    try {
      const batchResult = await processBatch(batchPages, analysisPrompt, maxPayloadSize, batchNumber);
      batches.push({
        batchNumber,
        pages: Array.from({ length: batchPages.length }, (_, idx) => i + idx + 1),
        extractedData: batchResult
      });
    } catch (error) {
      batches.push({
        batchNumber,
        pages: Array.from({ length: batchPages.length }, (_, idx) => i + idx + 1),
        extractedData: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Combine all batch results
  return combineBatchResults(batches);
}

async function processBatch(
  imagePaths: string[], 
  analysisPrompt: string, 
  maxPayloadSize: number,
  batchNumber: number
): Promise<string> {
  const { readFile } = await import('fs/promises');
  const openai = createOpenAIClient();
  
  const imageMessages = [];
  let totalSize = 0;
  
  for (let i = 0; i < imagePaths.length; i++) {
    const imagePath = imagePaths[i];
    const imageBuffer = await readFile(imagePath);
    
    // Check payload size
    if (totalSize + imageBuffer.length > maxPayloadSize) {
      console.warn(`Batch ${batchNumber}: Stopping at image ${i + 1} due to payload size limit`);
      break;
    }
    
    const base64Image = imageBuffer.toString('base64');
    totalSize += base64Image.length;
    
    imageMessages.push({
      type: "image_url",
      image_url: {
        url: `data:image/jpeg;base64,${base64Image}`,
        detail: "medium"
      }
    } as any);
  }
  
  if (imageMessages.length === 0) {
    throw new Error(`Batch ${batchNumber}: No images could be processed due to size constraints`);
  }
  
  // Create batch-specific prompt
  const batchPrompt = `${analysisPrompt}\n\nNote: This is batch ${batchNumber} of a larger document. Extract all relevant information from these pages.`;
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: "text",
          text: batchPrompt
        },
        ...imageMessages
      ]
    }],
    max_tokens: 4000,
    temperature: 0.1
  });
  
  return completion.choices[0].message.content || `No data extracted from batch ${batchNumber}`;
}

function combineBatchResults(batches: ProcessedBatch[]): string {
  let combinedResult = '';
  const errors: string[] = [];
  
  // Add successful batches
  const successfulBatches = batches.filter(b => !b.error);
  if (successfulBatches.length > 0) {
    combinedResult += "=== EXTRACTED DOCUMENT DATA ===\n\n";
    
    successfulBatches.forEach(batch => {
      combinedResult += `--- Pages ${batch.pages[0]}-${batch.pages[batch.pages.length - 1]} ---\n`;
      combinedResult += batch.extractedData + '\n\n';
    });
  }
  
  // Add error summary if any
  const failedBatches = batches.filter(b => b.error);
  if (failedBatches.length > 0) {
    combinedResult += "\n=== PROCESSING ERRORS ===\n\n";
    failedBatches.forEach(batch => {
      combinedResult += `Pages ${batch.pages[0]}-${batch.pages[batch.pages.length - 1]}: ${batch.error}\n`;
    });
  }
  
  // Add summary
  combinedResult += `\n=== PROCESSING SUMMARY ===\n`;
  combinedResult += `Total batches: ${batches.length}\n`;
  combinedResult += `Successful: ${successfulBatches.length}\n`;
  combinedResult += `Failed: ${failedBatches.length}\n`;
  
  return combinedResult;
}