'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, FileText, Image, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface DocumentPreviewProps {
  filename: string
  url: string
  className?: string
}

export default function DocumentPreview({ filename, url, className }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(false)

  const fileExtension = filename.split('.').pop()?.toLowerCase()
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '')

  const handleDownload = () => {
    window.open(url, '_blank')
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isImage ? <Image className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
            <span className="text-sm font-medium truncate">{filename}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center min-h-[150px]">
          {isImage ? (
            <img
              src={url}
              alt={filename}
              className="max-h-[400px] w-auto h-auto object-contain"
            />
          ) : (
            <div className="text-center p-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Vorschau für diesen Dateityp nicht verfügbar.</p>
              <p className="text-xs text-gray-400 mt-1">Bitte laden Sie die Datei herunter, um sie anzusehen.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}