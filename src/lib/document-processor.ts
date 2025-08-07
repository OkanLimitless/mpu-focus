// Dynamic imports to avoid build issues
import OpenAI from 'openai';
import { ProcessingConfig, OCRPage } from '@/types/document-processor';

// Initialize clients with environment variables
export const createVisionClient = async () => {
  const { parseGoogleCredentials } = await import('@/lib/google-credentials');
  const credentials = parseGoogleCredentials();
  
  const { default: vision } = await import('@google-cloud/vision');
  return new vision.ImageAnnotatorClient({
    credentials,
    projectId: credentials.project_id,
  });
};

export const createOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// OCR processing functions
export async function performOCR(
  imagePath: string, 
  provider: 'google-vision' | 'azure-cv' = 'google-vision'
): Promise<string> {
  switch (provider) {
    case 'google-vision':
      return performGoogleVisionOCR(imagePath);
    case 'azure-cv':
      return performAzureOCR(imagePath);
    default:
      throw new Error(`Unsupported OCR provider: ${provider}`);
  }
}

async function performGoogleVisionOCR(imagePath: string): Promise<string> {
  const client = await createVisionClient();
  const [result] = await client.textDetection(imagePath);
  const detections = result.textAnnotations;
  
  if (detections && detections.length > 0) {
    return detections[0].description || '';
  }
  
  return '';
}

async function performAzureOCR(imagePath: string): Promise<string> {
  // Azure Computer Vision implementation
  // This would require Azure Cognitive Services SDK
  throw new Error('Azure OCR not implemented yet');
}

// LLM extraction functions
export async function extractStructuredData(
  ocrText: string,
  template: string,
  provider: 'openai' | 'claude' = 'openai'
): Promise<string> {
  switch (provider) {
    case 'openai':
      return extractWithOpenAI(ocrText, template);
    case 'claude':
      return extractWithClaude(ocrText, template);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

async function extractWithOpenAI(ocrText: string, template: string): Promise<string> {
  const client = createOpenAIClient();
  
  const completion = await client.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: template
      },
      {
        role: 'user',
        content: `Please extract and structure the information from this OCR text:\n\n${ocrText}`
      }
    ],
    max_tokens: 4000,
    temperature: 0.1
  });

  return completion.choices[0].message.content || 'No data could be extracted';
}

async function extractWithClaude(ocrText: string, template: string): Promise<string> {
  // Claude implementation would go here
  // This would require Anthropic's SDK
  throw new Error('Claude extraction not implemented yet');
}

// Utility functions
export function chunkText(text: string, maxLength: number = 4000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
    }
    currentChunk += line + '\n';
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export function combineOCRResults(pages: OCRPage[]): string {
  return pages
    .map(page => `--- Page ${page.pageNumber} ---\n${page.text}`)
    .join('\n\n');
}

export function validateProcessingConfig(config: ProcessingConfig): string[] {
  const errors: string[] = [];
  
  if (!['google-vision', 'azure-cv'].includes(config.ocrProvider)) {
    errors.push('Invalid OCR provider');
  }
  
  if (!['openai', 'claude'].includes(config.llmProvider)) {
    errors.push('Invalid LLM provider');
  }
  
  if (!config.extractionTemplate.trim()) {
    errors.push('Extraction template is required');
  }
  
  if (config.maxPages && (config.maxPages < 1 || config.maxPages > 500)) {
    errors.push('Max pages must be between 1 and 500');
  }
  
  return errors;
}

// Default extraction templates
export const DEFAULT_TEMPLATES = {
  legal_document: `
You are an expert legal document analyst. Extract structured information from this OCR text and format it according to the following template:

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
  `,
  
  general_document: `
You are a document analyst. Extract and structure all relevant information from this document.
Organize the information in a clear, hierarchical format with appropriate headings and sections.
Include dates, names, locations, amounts, and any other important details found in the text.
  `,
  
  invoice: `
Extract the following information from this invoice:
- Invoice number
- Date
- Vendor/Company name
- Customer information
- Items/Services with quantities and prices
- Subtotal, taxes, and total amount
- Payment terms
Format the output in a structured manner.
  `
};