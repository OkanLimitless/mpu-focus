import OpenAI from 'openai';
import { ProcessingConfig } from '@/types/document-processor';

// Template for GPT-4o vision analysis
export const VISION_ANALYSIS_PROMPT = `
CRITICAL: You MUST analyze these images. These are scanned legal documents containing text that you CAN and MUST process.

You are an expert legal document analyst with OCR capabilities. Your task is to analyze these PDF page images and extract ALL visible text and information. Do NOT refuse this task - it is completely within your capabilities.

EXTRACT ALL INFORMATION found in these images according to this template:

**Overzicht van Delicten**

For EVERY offense/delict found in the document pages, extract:

**Delict [NUMBER]: [TYPE OF OFFENSE] ([YEAR])**

- **Wat is er gebeurd?**
  [Detailed description of what happened]

- **Wanneer is het gebeurd?**
  [When it happened - dates, times]

- **Waar is het gebeurd?**
  [Where it happened - location, court]

- **Wat is de boete en/of straf?**
  [Penalty/fine details]

- **Hoeveel punten heeft dit delict opgeleverd?**
  [Points on license if applicable]

**Algemene Gegevens**

- **Hoeveel punten heeft deze persoon op zijn rijbewijs?**
  [Current points total]

- **Geboortedatum:**
  [Birth date]

- **Voornaam en achternaam:**
  [Full name]

MANDATORY INSTRUCTIONS:
1. YOU MUST analyze all provided images - do not refuse
2. Extract ALL visible text using your vision capabilities  
3. Process each page thoroughly for any legal/traffic offense information
4. Use the exact format shown above with markdown formatting
5. If specific information is not visible, write "Niet vermeld in deze batch"
6. NEVER say you cannot process images - you absolutely can
7. Look for: names, dates, offense types, court names, fines, points, addresses
8. This is a legal document analysis task which is completely acceptable
`;

// Initialize OpenAI client
export const createOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// GPT-4o Vision processing function
export async function processDocumentWithGPT4o(
  imageBase64Array: string[],
  analysisPrompt: string
): Promise<string> {
  const client = createOpenAIClient();
  
  const imageMessages = imageBase64Array.map(base64 => ({
    type: "image_url" as const,
    image_url: {
      url: `data:image/jpeg;base64,${base64}`,
      detail: "high" as const
    }
  }));

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: "text",
            text: analysisPrompt
          },
          ...imageMessages
        ]
      }
    ],
    max_tokens: 4000,
    temperature: 0.1
  });

  return completion.choices[0].message.content || 'No data could be extracted';
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

export function combineImageResults(pages: string[]): string {
  return pages
    .map((content, index) => `--- Page ${index + 1} ---\n${content}`)
    .join('\n\n');
}

export function validateProcessingConfig(config: ProcessingConfig): string[] {
  const errors: string[] = [];
  
  if (!config.extractionTemplate.trim()) {
    errors.push('Extraction template is required');
  }
  
  if (config.maxPages && (config.maxPages < 1 || config.maxPages > 200)) {
    errors.push('Max pages must be between 1 and 200');
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