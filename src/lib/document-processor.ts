import OpenAI from 'openai';
import { ProcessingConfig } from '@/types/document-processor';

// System and user prompts for GPT vision analysis
export const VISION_ANALYSIS_SYSTEM_PROMPT = `
Je bent een professionele analist van Duitse officiële juridische documenten (MPU-context). Je doel is maximale volledigheid en nauwkeurigheid. Gebruik visuele OCR-capaciteiten om ALLE zichtbare informatie te extraheren, inclusief kleine lettertjes, stempels en tabellen. 

Werkwijze en taal:
- Lees en interpreteer de brontekst in het Duits voor maximale betrouwbaarheid.
- Controleer kritieke gegevens tegen de originele Duitse formuleringen.
- Rapporteer de uiteindelijke output in het Nederlands.

Kwaliteit en verificatie:
- Voeg waar zinvol korte exacte citaten uit de Duitse brontekst toe (Citaat (Duits): "...") voor cruciale velden (bijv. zaaknummer, promillage/BAC, wetsartikelen, beslissingsdatum, boetebedragen). 
- Markeer ontbrekende gegevens expliciet als "Niet vermeld".
- Voeg paginaverwijzingen toe bij elk delict en elke belangrijke data (bijv. Pagina 7).
`;

// Detailed instructions and output format (Dutch), while extraction is grounded in German source text
export const VISION_ANALYSIS_PROMPT = `
OPDRACHT: Extraheer gestructureerde informatie uit Duitse juridische MPU-documenten. Verwerk ALLE pagina's volledig en rapporteer de UITKOMST in het Nederlands, met waar nodig Duitse citaten ter onderbouwing.

UITVOERFORMAAT (Nederlands, Markdown):

**Overzicht van delicten**

Voor ELK delict in het dossier, rapporteer:

**Delict [NUMMER]: [TYPE DELICT] ([JAAR]) — Pagina(s): [PAGINA-VERWIJZING]**
- **Wat is er gebeurd?**
  Beschrijving van het incident.
- **Wanneer is het gebeurd?**
  Datum/tijd (alle bekende datums: overtreding, beslissing/vonnis, eventuele inwerkingtreding).
- **Waar is het gebeurd?**
  Plaats/city en bevoegde instantie/rechtbank (naam rechtbank/Behörde).
- **Zaaknummer / Aktenzeichen**
  Nummer + Citaat (Duits) indien aanwezig.
- **Wetsverwijzing(en)**
  Artikelen/Paragrafen (bijv. StVG, StGB) + Citaat (Duits) indien aanwezig.
- **Boete en/of straf**
  Boete(n), daggeld, bijkomende straffen, proeftijd, Fahrverbot/Fahrerlaubnis-Entzug incl. duur.
- **Punten (Flensburg)**
  Aantal punten indien van toepassing.
- **Alcohol/Drugs (indien relevant)**
  BAC/promillage of stoffen/waarden + Citaat (Duits).
- **Overige maatregelen**
  Bijv. medische/psychologische eisen, cursussen, ontzeggingstermijnen.

**Algemene gegevens**
- **Totaal aantal punten (indien bekend)**
- **Geboortedatum**
- **Voornaam en achternaam**
- **Overige identificerende info** (dossiernummer, adresfragmenten indien zichtbaar)

Regels:
1. Output in het Nederlands. 
2. Als informatie ontbreekt: schrijf "Niet vermeld".
3. Voeg paginaverwijzingen toe waar je de informatie vond.
4. Voeg korte Duitse citaten toe voor kritieke gegevens waar mogelijk.
5. Wees volledig en systematisch; mis geen delicten of data.
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