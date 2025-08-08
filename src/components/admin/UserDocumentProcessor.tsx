"use client"

import { useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  userId: string
  onAttached?: (doc: any) => void
}

interface ProcessingStatus {
  step: string
  progress: number
  message: string
}

export default function UserDocumentProcessor({ userId, onAttached }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    fileName: string
    totalPages: number
    extractedData: string
  } | null>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB')
      return
    }
    setFile(selectedFile)
    setError(null)
  }

  const handleProcess = async () => {
    if (!file) return
    setIsProcessing(true)
    setError(null)
    setProcessingStatus({ step: 'Converting PDF', progress: 0, message: 'Converting PDF to images...' })

    try {
      const { convertPdfToImages } = await import('@/lib/pdf-to-images-client')
      const images = await convertPdfToImages(file, {
        scale: file.size > 15 * 1024 * 1024 ? 1.2 : 1.5,
        onProgress: (progress, message) => {
          setProcessingStatus({ step: 'Converting PDF', progress: Math.round(progress * 0.4), message })
        },
      })

      if (images.length === 0) throw new Error('No images extracted from PDF')

      setProcessingStatus({ step: 'Uploading images', progress: 40, message: `Uploading ${images.length} pages...` })

      const { uploadImagesToUploadThing } = await import('@/lib/uploadthing-upload')

      // Convert base64 images to File objects
      const imageFiles: File[] = []
      for (let i = 0; i < images.length; i++) {
        const base64Data = images[i].split(',')[1]
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let j = 0; j < byteCharacters.length; j++) byteNumbers[j] = byteCharacters.charCodeAt(j)
        const byteArray = new Uint8Array(byteNumbers)
        const blob = new Blob([byteArray], { type: 'image/jpeg' })
        imageFiles.push(new File([blob], `page-${i + 1}.jpg`, { type: 'image/jpeg' }))
      }

      const uploadedImages = await uploadImagesToUploadThing(imageFiles, {
        onProgress: (progress) => setProcessingStatus({ step: 'Uploading images', progress: 40 + Math.round(progress * 0.3), message: `Uploading... ${Math.round(progress)}%` }),
      })

      const imageUrls = uploadedImages
        .map((img: any) => img.serverData?.fileUrl || img.url)
        .filter(Boolean)

      if (imageUrls.length === 0) throw new Error('No valid image URLs received')

      setProcessingStatus({ step: 'AI Analysis', progress: 70, message: `Analyzing ${imageUrls.length} pages...` })

      const response = await fetch('/api/document-processor/process-image-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls, fileName: file.name }),
      })

      if (!response.ok) throw new Error('Processing failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.error) throw new Error(data.message || 'Processing failed')
                const adjustedProgress = 70 + (data.progress || 0) * 0.3
                if (data.step || data.message) setProcessingStatus({ step: data.step || 'Processing', progress: Math.round(adjustedProgress), message: data.message || 'Processing...' })
                if (data.result) {
                  const r = {
                    fileName: data.result.fileName,
                    totalPages: data.result.totalPages,
                    extractedData: data.result.extractedData,
                  }
                  setResult(r)
                  setIsProcessing(false)

                  // Auto-attach to user
                  try {
                    const attachRes = await fetch(`/api/admin/users/${userId}/processed-documents`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        fileName: r.fileName,
                        totalPages: r.totalPages,
                        extractedData: r.extractedData,
                        processingMethod: 'UploadThing + GPT-5 Mini Single Request Analysis',
                        processingNotes: 'Attached automatically from Admin User Processor',
                      }),
                    })
                    if (attachRes.ok) {
                      const attachData = await attachRes.json()
                      onAttached?.(attachData.document)
                    }
                  } catch (e) {
                    console.error('Auto-attach failed', e)
                  }
                }
              } catch {}
            }
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred')
      setIsProcessing(false)
    }
  }

  const handleGeneratePDF = async () => {
    if (!result) return
    try {
      setIsGeneratingPDF(true)
      const res = await fetch('/api/document-processor/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extractedData: result.extractedData, fileName: result.fileName }),
      })
      if (!res.ok) throw new Error('PDF generation failed')
      const data = await res.json()
      if (!data.success || !data.htmlContent) throw new Error('Invalid response from PDF generation service')
      const printWindow = window.open('', '_blank')
      if (!printWindow) throw new Error('Popup blocked')
      printWindow.document.write(data.htmlContent)
      printWindow.document.close()
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
          setTimeout(() => printWindow.close(), 1000)
        }, 500)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to generate PDF')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Generate & Attach Processed Document
        </CardTitle>
        <CardDescription>Upload a PDF, process with AI, and automatically attach the result to this user</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" id="user-doc-file" disabled={isProcessing} />
              <label htmlFor="user-doc-file" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p className="text-sm text-gray-600">Choose a PDF file (max 100MB)</p>
              </label>
            </div>
            {file && (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded border border-green-200">
                <div>
                  <div className="font-medium text-green-800">{file.name}</div>
                  <div className="text-xs text-green-700">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
                <Button onClick={handleProcess} disabled={isProcessing} className="flex items-center gap-2">
                  {isProcessing ? (<><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>) : 'Process & Attach'}
                </Button>
              </div>
            )}
            {isProcessing && processingStatus && (
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span className="font-medium">{processingStatus.step}</span></div>
                <Progress value={processingStatus.progress} className="w-full" />
                <p className="text-sm text-gray-600">{processingStatus.message}</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700"><CheckCircle className="h-4 w-4" /> Attached to user successfully</div>
            <div className="text-sm">File: <span className="font-medium">{result.fileName}</span> • Pages: {result.totalPages}</div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setFile(null); setResult(null); setProcessingStatus(null); setError(null); }}>Process Another</Button>
              <Button onClick={handleGeneratePDF} disabled={isGeneratingPDF} className="bg-blue-600 hover:bg-blue-700">
                {isGeneratingPDF ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating PDF...</>) : 'Generate PDF Report'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}