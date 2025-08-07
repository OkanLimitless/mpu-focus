export interface ProcessingStatus {
  step: string;
  progress: number;
  message: string;
}

export interface ExtractionResult {
  id: string;
  fileName: string;
  totalPages: number;
  extractedData: string;
  processingTime: number;
  createdAt: string;
}

export interface DocumentProcessorResponse {
  status?: ProcessingStatus;
  result?: ExtractionResult;
  error?: string;
}

export interface ProcessingConfig {
  extractionTemplate: string;
  imageQuality: 'low' | 'medium' | 'high';
  maxPages?: number;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  fields: TemplateField[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'boolean' | 'list';
  required: boolean;
  description?: string;
}

export interface ProcessedDocument {
  id: string;
  fileName: string;
  originalSize: number;
  totalPages: number;
  processingTime: number;
  extractedData: string;
  structuredData?: Record<string, any>;
  templateUsed?: string;
  ocrText: string;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}