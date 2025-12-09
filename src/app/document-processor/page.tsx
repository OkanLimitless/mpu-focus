'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { uploadToUploadThing } from '@/lib/uploadthing-upload';
import { useToast } from '@/hooks/use-toast'
import { useI18n } from '@/components/providers/i18n-provider'
// Removed client-side PDF generator - now using GPT-powered server-side generation

interface ProcessingStatus {
  step: string;
  progress: number;
  message: string;
}

interface DebugLog {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  data?: string;
}

interface ExtractionResult {
  id: string;
  fileName: string;
  totalPages: number;
  extractedData: string;
  processingTime: number;
  createdAt: string;
  processingMethod?: string;
  processingNotes?: string;
}

export default function DocumentProcessor() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadMethod, setUploadMethod] = useState<'direct' | 'uploadthing'>('direct');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  // Check if we're processing for a specific user (from URL params)
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetUserName, setTargetUserName] = useState<string | null>(null);
  const { toast } = useToast()
  const { t } = useI18n()
  const [isDragActive, setIsDragActive] = useState(false)
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [showDebugLogs, setShowDebugLogs] = useState(false)

  useEffect(() => {
    // Check URL parameters for user ID and name
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const userName = urlParams.get('userName');
    
    if (userId) {
      setTargetUserId(userId);
      setTargetUserName(userName);
    }
  }, []);

  // Function to save processing results to user account
  const saveResultsToUser = async (result: ExtractionResult) => {
    try {
      const response = await fetch(`/api/admin/users/${targetUserId}/document-processing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedData: result.extractedData,
          fileName: result.fileName,
          totalPages: result.totalPages,
          processingMethod: result.processingMethod || 'Document Processor Tool',
          processingNotes: result.processingNotes || 'Processed via admin panel'
        }),
      });

      if (response.ok) {
        console.log('Results saved to user account successfully');
        toast({ title: 'Erfolg', description: 'Ergebnisse dem Benutzerkonto zugeordnet.' })
      } else {
        console.error('Failed to save results to user account');
        toast({ title: 'Fehler', description: 'Ergebnisse konnten nicht gespeichert werden.', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Error saving results to user account:', error);
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen.', variant: 'destructive' })
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file')
        toast({ title: 'Ungültiger Dateityp', description: 'Bitte eine PDF-Datei auswählen.', variant: 'destructive' })
        return;
      }
      if (selectedFile.size > 100 * 1024 * 1024) {
        setError('File size must be less than 100MB. Large files will be processed with adaptive quality.');
        toast({ title: 'Datei zu groß', description: 'Maximale Größe 100MB.', variant: 'destructive' })
        return;
      }
      
      // All files now use client-side processing - no need for UploadThing
      setUploadMethod('direct');
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const syntheticEvent = { target: { files: [droppedFile] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(syntheticEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
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
              await processFromUploadThing(uploadResult.ufsUrl, uploadResult.name, uploadResult.key);
      
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setIsProcessing(false);
      toast({ title: 'Upload fehlgeschlagen', description: error instanceof Error ? error.message : 'Unbekannter Fehler', variant: 'destructive' })
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
    setDebugLogs([]); // Clear previous logs
    try {
      // Upload original PDF to UploadThing to obtain a public URL
      setProcessingStatus({ step: 'Uploading PDF', progress: 10, message: 'Uploading PDF to secure storage...' });
      const uploadResult = await uploadToUploadThing(file, {
        onUploadBegin: () => {
          setProcessingStatus({ step: 'Uploading PDF', progress: 15, message: 'Upload started...' });
        },
        onUploadProgress: ({ progress }) => {
          setProcessingStatus({ step: 'Uploading PDF', progress: 15 + Math.round(progress * 0.35), message: `Uploading... ${Math.round(progress)}%` });
        }
      });

      if (!uploadResult) {
        throw new Error('Upload failed - no response received');
      }

      const fileUrl = (uploadResult as any).ufsUrl || (uploadResult as any).url;
      if (!fileUrl) {
        throw new Error('No public URL returned after upload');
      }

      // Start Google Vision PDF OCR (SSE)
      setProcessingStatus({ step: 'OCR', progress: 10, message: 'Uploading to Google Cloud and starting OCR...' });
      const ocrResp = await fetch('/api/ocr/vision/parse-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfUrl: fileUrl, fileName: file.name })
      });

      if (!ocrResp.ok || !ocrResp.body) {
        throw new Error('Failed to start OCR processing');
      }

      const ocrReader = ocrResp.body.getReader();
      const decoder = new TextDecoder();
      setDebugLogs([]) // Clear previous logs
      while (true) {
        const { done, value } = await ocrReader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            
            // Handle debug logs
            if (data.log) {
              setDebugLogs(prev => [...prev, data.log].slice(-100)) // Keep last 100 logs
              if (data.log.level === 'error') {
                setShowDebugLogs(true) // Auto-show on errors
              }
            }
            
            // Handle phase updates (pass1, pass2, etc.)
            if (data.phase) {
              const phaseMsg = `Phase ${data.phase}: ${data.status || 'processing'}`
              if (data.status === 'cluster:fail' || data.status === 'skip') {
                setDebugLogs(prev => [...prev, {
                  level: 'warn',
                  message: `${phaseMsg}${data.error ? ` - ${data.error}` : ''}`,
                  timestamp: new Date().toISOString()
                }].slice(-100))
              }
            }
            
            if (data.error) throw new Error(data.message || 'Processing failed');
            if (typeof data.progress === 'number') {
              setProcessingStatus({ step: data.step || 'Processing', progress: Math.min(100, Math.max(10, Math.round(data.progress))), message: data.message || 'Processing...' });
            }
            if (data.result) {
              setResult(data.result);
              setIsProcessing(false);
              if (targetUserId && data.result.extractedData) {
                saveResultsToUser(data.result);
              }
            }
          } catch (parseError) {
            // Log parsing errors instead of silently swallowing them
            console.error('Error parsing SSE data:', parseError, 'Line:', line.slice(0, 200))
            setDebugLogs(prev => [...prev, {
              level: 'error',
              message: `Failed to parse server message: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
              timestamp: new Date().toISOString(),
              data: line.slice(0, 200)
            }].slice(-100))
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsProcessing(false);
      toast({ title: 'Verarbeitung fehlgeschlagen', description: err instanceof Error ? err.message : 'Unbekannter Fehler', variant: 'destructive' })
    }
  };

  const runAnalysisWithImageUrls = async (imageUrls: string[], fileName: string) => {
    setProcessingStatus({ step: 'AI Analysis', progress: 75, message: `Starting AI analysis of ${imageUrls.length} pages...` });

    const response = await fetch('/api/document-processor/process-image-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrls, fileName })
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to process document');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.error) throw new Error(data.message || 'Processing failed');
          const adjustedProgress = 75 + (data.progress || 0) * 0.25;
          setProcessingStatus({
            step: data.step || 'Processing',
            progress: Math.min(100, Math.round(adjustedProgress)),
            message: data.message || 'Processing...'
          });
          if (data.result) {
            setResult(data.result);
            setIsProcessing(false);
            if (targetUserId && data.result.extractedData) {
              saveResultsToUser(data.result);
            }
          }
        } catch {}
      }
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setProcessingStatus(null);
    setIsProcessing(false);
  };

  const handleGeneratePDF = async (extractedData: string, fileName: string) => {
    try {
      setError(null);
      setIsGeneratingPDF(true);
      
      // Get GPT-generated HTML
      const response = await fetch('/api/document-processor/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedData,
          fileName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'PDF generation failed');
      }

      const data = await response.json();
      
      if (!data.success || !data.htmlContent) {
        throw new Error('Invalid response from PDF generation service');
      }

      // Create a new window with the HTML content for PDF generation
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Write the GPT-generated HTML to the new window
      printWindow.document.write(data.htmlContent);
      printWindow.document.close();

      // Wait for content to load, then automatically trigger save as PDF
      printWindow.onload = () => {
        setTimeout(() => {
          // Focus the window and trigger print (which can be saved as PDF)
          printWindow.focus();
          printWindow.print();
          
          // Close the window after a delay
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        }, 500);
      };
      toast({ title: 'PDF bereit', description: 'Druckdialog geöffnet. Wähle "Als PDF speichern".' })
    } catch (error) {
      console.error('PDF generation failed:', error);
      setError(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({ title: 'PDF-Generierung fehlgeschlagen', description: error instanceof Error ? error.message : 'Unbekannter Fehler', variant: 'destructive' })
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadHtml = (html: string, suggestedName: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (suggestedName?.replace(/\.[^.]+$/, '') || 'document') + '.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: 'Download gestartet', description: 'HTML-Datei wurde heruntergeladen.' })
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('documentProcessorTitle')}</h1>
        <p className="text-gray-600">{t('documentProcessorSubtitle')}</p>
        {targetUserId && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">
               🎯 {t('docProc_processingForUser')}: {targetUserName || t('unknownUser')}
            </p>
            <p className="text-blue-600 text-sm">
              {t('docProc_resultsAutosaved')}
            </p>
          </div>
        )}
      </div>

      {!result ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
             {t('documentProcessorTitle')}
            </CardTitle>
            <CardDescription>
             {t('supportsUpTo')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Smart File Upload - detect file size and route accordingly */}
            {!file ? (
              <>
                {/* File Selection with Drag-and-Drop */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer block">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium mb-2">
                     {t('choosePdfOrDrag')}
                    </p>
                    <p className="text-sm text-gray-500">
                     {t('supportsUpTo')}
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
                         {t('processing')}
                        </>
                      ) : (
                        t('processDocument')
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
                           {processingStatus?.step || t('processing')}
                          </>
                        ) : (
                         t('processDocument')
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

            {/* Debug Logs Panel */}
            {(debugLogs.length > 0 || isProcessing) && (
              <Card className="border-gray-300">
                <CardHeader className="pb-3">
                  <button
                    onClick={() => setShowDebugLogs(!showDebugLogs)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4 text-gray-500" />
                      <CardTitle className="text-sm font-medium">
                        Debug Logs {debugLogs.length > 0 && `(${debugLogs.length})`}
                      </CardTitle>
                      {debugLogs.filter(l => l.level === 'error').length > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          {debugLogs.filter(l => l.level === 'error').length} errors
                        </span>
                      )}
                    </div>
                    {showDebugLogs ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </CardHeader>
                {showDebugLogs && (
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto">
                      {debugLogs.length === 0 ? (
                        <div className="text-gray-500">No debug logs yet...</div>
                      ) : (
                        <div className="space-y-1">
                          {debugLogs.map((log, idx) => {
                            const time = new Date(log.timestamp).toLocaleTimeString()
                            const levelColors = {
                              info: 'text-blue-400',
                              warn: 'text-yellow-400',
                              error: 'text-red-400'
                            }
                            return (
                              <div key={idx} className="flex gap-2">
                                <span className="text-gray-500">{time}</span>
                                <span className={levelColors[log.level]}>[{log.level.toUpperCase()}]</span>
                                <span className="flex-1">{log.message}</span>
                                {log.data && (
                                  <span className="text-gray-500 text-xs">({log.data})</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
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
             {t('processingComplete')}
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
             <h3 className="font-medium mb-2">{t('extractedData')}</h3>
              <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{result.extractedData}</pre>
              </div>
            </div>

            {/* PDF Generation Section */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-medium text-blue-800">Professional PDF Report</h3>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGeneratePDF(result.extractedData, result.fileName)}
                    disabled={isGeneratingPDF}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       {t('processing')}
                      </>
                    ) : (
                     t('generatePdf')
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const resp = await fetch('/api/document-processor/generate-pdf', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ extractedData: result.extractedData, fileName: result.fileName })
                        })
                        if (!resp.ok) {
                          const err = await resp.json().catch(() => ({}))
                          throw new Error(err.details || 'Generierung fehlgeschlagen')
                        }
                        const data = await resp.json()
                        if (data?.htmlContent) {
                          handleDownloadHtml(data.htmlContent, result.fileName)
                        } else {
                          throw new Error('Ungültige Antwort vom Server')
                        }
                      } catch (e: any) {
                        toast({ title: 'Download fehlgeschlagen', description: e?.message || 'Unbekannter Fehler', variant: 'destructive' })
                      }
                    }}
                  >
                   {t('downloadHtml')}
                  </Button>
                </div>
              </div>
              {isGeneratingPDF && (
                <div className="mt-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <div className="flex-1 bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                   <span>{t('processing')}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline">
               {t('processAnother')}
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(result.extractedData);
                }}
                variant="secondary"
              >
               {t('copyExtracted')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
