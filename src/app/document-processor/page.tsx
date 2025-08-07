'use client';

import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToUploadThing } from '@/lib/uploadthing-upload';

interface ProcessingStatus {
  step: string;
  progress: number;
  message: string;
}

interface ExtractionResult {
  id: string;
  fileName: string;
  totalPages: number;
  extractedData: string;
  processingTime: number;
  createdAt: string;
}

export default function DocumentProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'direct' | 'uploadthing'>('direct');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) { // 100MB limit
        setError('File size must be less than 100MB. Large files will be processed with adaptive quality.');
        return;
      }
      
      // Determine upload method based on file size
      if (selectedFile.size > 4 * 1024 * 1024) { // >4MB
        setUploadMethod('uploadthing');
      } else {
        setUploadMethod('direct');
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUploadAndProcess = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProcessingStatus({ step: 'Uploading to UploadThing...', progress: 10, message: 'Preparing secure upload...' });

    try {
      // Upload to UploadThing
      const uploadResult = await uploadToUploadThing(file, {
        onUploadBegin: () => {
          setProcessingStatus({ step: 'Uploading file...', progress: 20, message: 'Uploading to secure storage...' });
        },
        onUploadProgress: ({ progress }) => {
          setProcessingStatus({ 
            step: 'Uploading file...', 
            progress: 20 + (progress * 0.3), // 20-50% for upload
            message: `Uploading... ${Math.round(progress)}%` 
          });
        }
      });

      if (!uploadResult) {
        throw new Error('Upload failed - no response received');
      }

      // Start processing from the uploaded file
      await processFromUploadThing(uploadResult.url, uploadResult.name, uploadResult.key);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setIsProcessing(false);
    }
  };

  const processFromUploadThing = async (fileUrl: string, fileName: string, fileKey: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/document-processor/process-from-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl,
          fileName,
          fileKey
        })
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.status) {
                  setProcessingStatus(data.status);
                } else if (data.result) {
                  setResult(data.result);
                  setIsProcessing(false);
                } else if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  const handleProcessDocument = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/document-processor/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process document');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.status) {
                  setProcessingStatus(data.status);
                } else if (data.result) {
                  setResult(data.result);
                  setIsProcessing(false);
                } else if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                // Ignore JSON parse errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProcessingStatus(null);
    setIsProcessing(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Processor</h1>
        <p className="text-gray-600">
          Upload large PDF documents to extract structured data using OCR and AI analysis
        </p>
      </div>

      {!result ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Document
            </CardTitle>
            <CardDescription>
              Select a PDF document (up to 100MB) - large files processed with adaptive quality
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Smart File Upload - detect file size and route accordingly */}
            {!file ? (
              <>
                {/* File Selection */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">
                      Choose PDF file or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports PDF files up to 100MB (auto-optimized upload)
                    </p>
                  </label>
                </div>
              </>
            ) : uploadMethod === 'direct' ? (
              <>
                {/* Small File - Direct Upload */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">{file.name}</p>
                      <p className="text-sm text-green-600">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB - Direct processing
                      </p>
                    </div>
                    <Button
                      onClick={handleProcessDocument}
                      disabled={isProcessing}
                      className="flex items-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Process Document'
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Large File - UploadThing Upload */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-blue-800">{file.name}</p>
                      <p className="text-sm text-blue-600">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB - Large file detected, using optimized upload
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <Button
                        onClick={handleUploadAndProcess}
                        disabled={isProcessing}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {processingStatus?.step || 'Processing...'}
                          </>
                        ) : (
                          'Upload & Process Document'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFile(null);
                          setUploadMethod('direct');
                        }}
                        className="text-sm"
                        disabled={isProcessing}
                      >
                        Choose Different File
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Processing Status */}
            {isProcessing && processingStatus && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="font-medium">{processingStatus.step}</span>
                    </div>
                    <Progress value={processingStatus.progress} className="w-full" />
                    <p className="text-sm text-gray-600">{processingStatus.message}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Results Display */
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Processing Complete
            </CardTitle>
            <CardDescription>
              Document processed successfully in {result.processingTime}s
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">File:</span> {result.fileName}
              </div>
              <div>
                <span className="font-medium">Pages:</span> {result.totalPages}
              </div>
              <div>
                <span className="font-medium">Processed:</span> {new Date(result.createdAt).toLocaleString()}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Extracted Data:</h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{result.extractedData}</pre>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline">
                Process Another Document
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(result.extractedData);
                }}
                variant="secondary"
              >
                Copy Extracted Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}