'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Eye, FileText, Image, Loader2, ZoomIn, ZoomOut } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Dynamically import react-pdf components to avoid SSR issues
const Document = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Document })),
  { ssr: false }
)
const Page = dynamic(
  () => import('react-pdf').then(mod => ({ default: mod.Page })),
  { ssr: false }
)

// Set up PDF.js worker only on client side
const setupPdfWorker = () => {
  if (typeof window !== 'undefined') {
    import('react-pdf').then(({ pdfjs }) => {
      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`
    })
  }
}

interface DocumentPreviewProps {
  filename: string
  url: string
  className?: string
}

export default function DocumentPreview({ filename, url, className }: DocumentPreviewProps) {
  const { toast } = useToast()
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState<number>(1)
  const [scale, setScale] = useState<number>(1.0)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState<boolean>(false)

  const fileExtension = filename.split('.').pop()?.toLowerCase()
  const isPDF = fileExtension === 'pdf'
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')

  useEffect(() => {
    setIsMounted(true)
    setupPdfWorker()
  }, [])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading document:', error)
    setError('Failed to load document')
    setLoading(false)
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      
      // Use the provided filename or extract from URL
      link.download = filename || 'document'
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      toast({
        title: "Download Started",
        description: `${filename} is being downloaded.`,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download the document. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!url || !filename) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-gray-500">
            <FileText className="h-8 w-8 mr-2" />
            <span>No document available</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isPDF ? <FileText className="h-5 w-5" /> : <Image className="h-5 w-5" />}
            <span className="text-sm font-medium truncate">{filename}</span>
          </div>
          <div className="flex items-center space-x-2">
            {isPDF && isMounted && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs text-gray-500">{Math.round(scale * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScale(Math.min(2.0, scale + 0.1))}
                  disabled={scale >= 2.0}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading document...</span>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center p-8 text-red-600">
              <span>{error}</span>
            </div>
          )}

          {isPDF && !error && isMounted && (
            <div className="pdf-container">
              <Document
                file={url}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
              
              {numPages > 1 && (
                <div className="flex items-center justify-center space-x-4 p-4 bg-white border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                    disabled={pageNumber <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {pageNumber} of {numPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(Math.min(numPages, pageNumber + 1))}
                    disabled={pageNumber >= numPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {isImage && !error && (
            <div className="image-container">
              <img
                src={url}
                alt={filename}
                className="w-full h-auto max-h-96 object-contain"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setError('Failed to load image')
                  setLoading(false)
                }}
              />
            </div>
          )}

          {!isPDF && !isImage && !error && (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Preview not available for this file type</p>
                <Button variant="outline" className="mt-4" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download to view
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}